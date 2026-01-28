import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  // 1. Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch all user data (RLS ensures user sees only their data)
    const [profile, roleProfiles, applications, jobOffers, preferences] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('role_profiles').select('*').eq('user_id', user.id),
      supabase.from('applications').select('*, cv_versions(*), cover_letters(*)').eq('user_id', user.id),
      supabase.from('job_offers').select('*').eq('user_id', user.id),
      supabase.from('job_preferences').select('*').eq('user_id', user.id).single(),
    ]);

    // 3. Build export object
    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: profile.data,
      role_profiles: roleProfiles.data,
      applications: applications.data,
      job_offers: jobOffers.data,
      preferences: preferences.data,
    };

    // 4. Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="asciv-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export data. Please try again.' },
      { status: 500 }
    );
  }
}
