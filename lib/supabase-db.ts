import { createClient } from './supabase-browser';
import type {
  Application,
  Template,
  CVVersion,
  CoverLetter,
  StatusChange,
  ApplicationTracking,
} from '@/app/types';

// Get current user ID helper
async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================
// APPLICATIONS CRUD
// ============================================

export async function loadApplications(): Promise<Application[]> {
  const supabase = createClient();

  // Fetch applications with their related data (RLS will filter by user_id)
  const { data: apps, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading applications:', error);
    return [];
  }

  if (!apps || apps.length === 0) return [];

  // Fetch related data for all applications in parallel
  const appIds = apps.map(app => app.id);

  const [cvVersionsRes, coverLettersRes, statusHistoryRes, trackingRes] = await Promise.all([
    supabase.from('cv_versions').select('*').in('application_id', appIds),
    supabase.from('cover_letters').select('*').in('application_id', appIds),
    supabase.from('status_history').select('*').in('application_id', appIds),
    supabase.from('application_tracking').select('*').in('application_id', appIds),
  ]);

  // Group related data by application_id
  const cvVersionsByApp = groupBy(cvVersionsRes.data || [], 'application_id');
  const coverLettersByApp = groupBy(coverLettersRes.data || [], 'application_id');
  const statusHistoryByApp = groupBy(statusHistoryRes.data || [], 'application_id');
  const trackingByApp = new Map((trackingRes.data || []).map(t => [t.application_id, t]));

  // Transform to Application type
  return apps.map(app => {
    const tracking = trackingByApp.get(app.id);

    return {
      id: app.id,
      company: app.company,
      role: app.role,
      jobDescription: app.job_description,
      jobUrl: app.job_url || undefined,
      selectedTemplateId: app.selected_template_id || undefined,
      status: app.status,
      createdAt: app.created_at,
      appliedAt: app.applied_at || undefined,
      notes: app.notes || '',
      tags: app.tags || [],
      isFavorite: app.is_favorite || false,
      cvVersions: (cvVersionsByApp.get(app.id) || [])
        .sort((a, b) => a.version - b.version)
        .map(cv => ({
          id: cv.id,
          version: cv.version,
          content: cv.content,
          generatedBy: cv.generated_by,
          createdAt: cv.created_at,
          modifiedAt: cv.modified_at || undefined,
        })),
      coverLetters: (coverLettersByApp.get(app.id) || [])
        .sort((a, b) => a.version - b.version)
        .map(cl => ({
          id: cl.id,
          version: cl.version,
          content: cl.content,
          style: cl.style,
          recipientInfo: cl.recipient_info,
          generatedBy: cl.generated_by,
          createdAt: cl.created_at,
          modifiedAt: cl.modified_at || undefined,
        })),
      statusHistory: (statusHistoryByApp.get(app.id) || [])
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(sh => ({
          status: sh.status,
          timestamp: sh.timestamp,
          note: sh.note || undefined,
        })),
      tracking: {
        sentDate: tracking?.sent_date || undefined,
        sentVia: tracking?.sent_via || undefined,
        followUpDates: tracking?.follow_up_dates || [],
        interviewScheduled: tracking?.interview_scheduled || undefined,
        outcome: tracking?.outcome || undefined,
        closedReason: tracking?.closed_reason || undefined,
        closedDate: tracking?.closed_date || undefined,
      },
    } as Application;
  });
}

export async function saveApplication(app: Application): Promise<boolean> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return false;
  }

  // Validate required fields
  if (!app.id || !app.company || !app.role) {
    console.error('Invalid application data - missing required fields:', {
      hasId: !!app.id,
      hasCompany: !!app.company,
      hasRole: !!app.role,
    });
    return false;
  }

  try {
    // Ensure arrays exist and have correct structure
    const safeApp = {
      ...app,
      cvVersions: Array.isArray(app.cvVersions) ? app.cvVersions : [],
      coverLetters: Array.isArray(app.coverLetters) ? app.coverLetters : [],
      statusHistory: Array.isArray(app.statusHistory) ? app.statusHistory : [],
      tags: Array.isArray(app.tags) ? app.tags : [],
      tracking: app.tracking || {
        followUpDates: [],
      },
    };

    // Helper to ensure timestamp is a number (BIGINT in database)
    const toTimestamp = (value: number | string | undefined): number | null => {
      if (!value) return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return new Date(value).getTime();
      return null;
    };

    // Upsert application with user_id
    const { error: appError } = await supabase
      .from('applications')
      .upsert({
        id: safeApp.id,
        user_id: userId,
        company: safeApp.company,
        role: safeApp.role,
        job_description: safeApp.jobDescription || '',
        job_url: safeApp.jobUrl || null,
        selected_template_id: safeApp.selectedTemplateId || null,
        status: safeApp.status || 'draft',
        created_at: toTimestamp(safeApp.createdAt) || Date.now(),
        applied_at: toTimestamp(safeApp.appliedAt),
        notes: safeApp.notes || '',
        tags: safeApp.tags,
        is_favorite: safeApp.isFavorite || false,
      });

    if (appError) {
      console.error('Error saving application:', JSON.stringify(appError, null, 2));
      return false;
    }

    // Upsert CV versions
    if (safeApp.cvVersions.length > 0) {
      const { error: cvError } = await supabase
        .from('cv_versions')
        .upsert(
          safeApp.cvVersions.map(cv => ({
            id: cv.id,
            application_id: safeApp.id,
            version: cv.version,
            content: cv.content,
            generated_by: cv.generatedBy,
            created_at: toTimestamp(cv.createdAt) || Date.now(),
            modified_at: toTimestamp(cv.modifiedAt),
          }))
        );

      if (cvError) {
        console.error('Error saving CV versions:', JSON.stringify(cvError, null, 2));
      }
    }

    // Upsert cover letters
    if (safeApp.coverLetters.length > 0) {
      const { error: clError } = await supabase
        .from('cover_letters')
        .upsert(
          safeApp.coverLetters.map(cl => ({
            id: cl.id,
            application_id: safeApp.id,
            version: cl.version,
            content: cl.content,
            style: cl.style,
            recipient_info: cl.recipientInfo,
            generated_by: cl.generatedBy,
            created_at: toTimestamp(cl.createdAt) || Date.now(),
            modified_at: toTimestamp(cl.modifiedAt),
          }))
        );

      if (clError) {
        console.error('Error saving cover letters:', JSON.stringify(clError, null, 2));
      }
    }

    // Delete old status history and insert new
    await supabase.from('status_history').delete().eq('application_id', safeApp.id);
    if (safeApp.statusHistory.length > 0) {
      const { error: shError } = await supabase
        .from('status_history')
        .insert(
          safeApp.statusHistory.map((sh, index) => ({
            // Generate unique ID: app.id + timestamp + index to ensure uniqueness
            id: `sh-${safeApp.id}-${sh.timestamp}-${index}`,
            application_id: safeApp.id,
            status: sh.status,
            timestamp: sh.timestamp,
            note: sh.note || null,
          }))
        );

      if (shError) {
        console.error('Error saving status history:', JSON.stringify(shError, null, 2));
      }
    }

    // Upsert tracking - use onConflict to handle existing records
    const trackingData = {
      application_id: safeApp.id,
      sent_date: safeApp.tracking.sentDate || null,
      sent_via: safeApp.tracking.sentVia || null,
      follow_up_dates: safeApp.tracking.followUpDates || [],
      interview_scheduled: safeApp.tracking.interviewScheduled || null,
      outcome: safeApp.tracking.outcome || null,
      closed_reason: safeApp.tracking.closedReason || null,
      closed_date: safeApp.tracking.closedDate || null,
    };

    const { error: trackingError } = await supabase
      .from('application_tracking')
      .upsert(trackingData, { onConflict: 'application_id' });

    if (trackingError) {
      console.error('Error saving tracking:', JSON.stringify(trackingError, null, 2));
    }

    return true;
  } catch (error) {
    console.error('Error in saveApplication:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function saveAllApplications(apps: Application[]): Promise<boolean> {
  try {
    for (const app of apps) {
      await saveApplication(app);
    }
    return true;
  } catch (error) {
    console.error('Error saving all applications:', error);
    return false;
  }
}

export async function deleteApplication(appId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', appId);

  if (error) {
    console.error('Error deleting application:', error);
    return false;
  }
  return true;
}

export async function deleteCVVersion(cvId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('cv_versions')
    .delete()
    .eq('id', cvId);

  if (error) {
    console.error('Error deleting CV version:', error);
    return false;
  }
  return true;
}

export async function deleteCoverLetter(coverLetterId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('cover_letters')
    .delete()
    .eq('id', coverLetterId);

  if (error) {
    console.error('Error deleting cover letter:', error);
    return false;
  }
  return true;
}

// ============================================
// TEMPLATES CRUD
// ============================================

export async function loadTemplates(): Promise<Template[]> {
  const supabase = createClient();

  // Fetch templates (RLS will filter by user_id)
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading templates:', error);
    return [];
  }

  return (data || []).map(t => ({
    id: t.id,
    name: t.name,
    type: t.type,
    icon: t.icon,
    color: t.color,
    content: t.content,
    createdAt: t.created_at,
    lastModified: t.last_modified,
    usageCount: t.usage_count || 0,
    successRate: t.success_rate || 0,
  }));
}

export async function saveTemplate(template: Template): Promise<boolean> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return false;
  }

  const { error } = await supabase
    .from('templates')
    .upsert({
      id: template.id,
      user_id: userId,
      name: template.name,
      type: template.type,
      icon: template.icon,
      color: template.color,
      content: template.content,
      created_at: template.createdAt,
      last_modified: template.lastModified,
      usage_count: template.usageCount,
      success_rate: template.successRate,
    });

  if (error) {
    console.error('Error saving template:', error);
    return false;
  }
  return true;
}

export async function saveAllTemplates(templates: Template[]): Promise<boolean> {
  try {
    for (const template of templates) {
      await saveTemplate(template);
    }
    return true;
  } catch (error) {
    console.error('Error saving all templates:', error);
    return false;
  }
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting template:', error);
    return false;
  }
  return true;
}

// ============================================
// MIGRATION FROM LOCALSTORAGE
// ============================================

export async function migrateFromLocalStorage(): Promise<{
  migratedApps: number;
  migratedTemplates: number;
  errors: string[];
}> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  let migratedApps = 0;
  let migratedTemplates = 0;
  const errors: string[] = [];

  // Don't migrate if not authenticated
  if (!userId) {
    return { migratedApps, migratedTemplates, errors: ['Not authenticated'] };
  }

  // Check if migration was already completed for this user
  const migrationKey = `migration-completed-${userId}`;
  if (localStorage.getItem(migrationKey) === 'true') {
    return { migratedApps, migratedTemplates, errors: [] };
  }

  try {
    // Check if data exists in localStorage
    const savedApps = localStorage.getItem('job-applications-v2');
    const savedTemplates = localStorage.getItem('job-templates-v2');

    // Check if data already exists in Supabase for this user
    const { data: existingApps } = await supabase
      .from('applications')
      .select('id')
      .limit(1);

    const { data: existingTemplates } = await supabase
      .from('templates')
      .select('id')
      .limit(1);

    // If data already exists in Supabase, mark migration as complete and skip
    if (existingApps && existingApps.length > 0) {
      localStorage.setItem(migrationKey, 'true');
      return { migratedApps, migratedTemplates, errors: [] };
    }

    // Migrate applications if localStorage has data and Supabase is empty for this user
    if (savedApps && (!existingApps || existingApps.length === 0)) {
      let apps: Application[];
      try {
        apps = JSON.parse(savedApps);
      } catch (parseError) {
        errors.push('Failed to parse localStorage applications');
        apps = [];
      }

      // Sanitize and add missing fields (migration)
      const migratedLocalApps = apps.map(app => {
        // Ensure createdAt is a number (timestamp)
        let createdAtTimestamp: number;
        if (typeof app.createdAt === 'number') {
          createdAtTimestamp = app.createdAt;
        } else if (typeof app.createdAt === 'string') {
          createdAtTimestamp = new Date(app.createdAt).getTime();
        } else {
          createdAtTimestamp = Date.now();
        }

        return {
          ...app,
          id: app.id || crypto.randomUUID(),
          company: app.company || 'Unknown Company',
          role: app.role || 'Unknown Role',
          status: app.status || 'draft',
          createdAt: createdAtTimestamp,
          jobDescription: app.jobDescription || '',
          notes: app.notes || '',
          tags: Array.isArray(app.tags) ? app.tags : [],
          isFavorite: app.isFavorite || false,
          cvVersions: Array.isArray(app.cvVersions) ? app.cvVersions : [],
          coverLetters: Array.isArray(app.coverLetters) ? app.coverLetters : [],
          statusHistory: Array.isArray(app.statusHistory) ? app.statusHistory : [],
          tracking: app.tracking || { followUpDates: [] },
        } as Application;
      });

      for (const app of migratedLocalApps) {
        try {
          const success = await saveApplication(app);
          if (success) {
            migratedApps++;
          } else {
            errors.push(`Failed to migrate app: ${app.company} - ${app.role}`);
          }
        } catch (appError) {
          errors.push(`Error migrating app ${app.company}: ${appError instanceof Error ? appError.message : String(appError)}`);
        }
      }

      console.log(`Migrated ${migratedApps}/${migratedLocalApps.length} applications to Supabase`);
    }

    // Migrate templates if localStorage has data and Supabase is empty for this user
    if (savedTemplates && (!existingTemplates || existingTemplates.length === 0)) {
      let templates: Template[];
      try {
        templates = JSON.parse(savedTemplates);
      } catch (parseError) {
        errors.push('Failed to parse localStorage templates');
        templates = [];
      }

      for (const template of templates) {
        try {
          const success = await saveTemplate(template);
          if (success) {
            migratedTemplates++;
          } else {
            errors.push(`Failed to migrate template: ${template.name}`);
          }
        } catch (templateError) {
          errors.push(`Error migrating template ${template.name}: ${templateError instanceof Error ? templateError.message : String(templateError)}`);
        }
      }

      console.log(`Migrated ${migratedTemplates}/${templates.length} templates to Supabase`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error during migration:', errorMessage);
    errors.push(`Migration error: ${errorMessage}`);
  }

  if (errors.length > 0) {
    console.warn('Migration completed with errors:', errors);
  } else if (migratedApps > 0 || migratedTemplates > 0) {
    // Mark migration as complete only if successful
    const migrationKey = `migration-completed-${userId}`;
    localStorage.setItem(migrationKey, 'true');
  }

  return { migratedApps, migratedTemplates, errors };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function groupBy<T>(array: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of array) {
    const groupKey = String(item[key]);
    const group = map.get(groupKey) || [];
    group.push(item);
    map.set(groupKey, group);
  }
  return map;
}
