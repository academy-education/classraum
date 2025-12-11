import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all admin settings
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .order('setting_key', { ascending: true });

    if (settingsError) {
      console.error('[Admin Settings API] Error fetching settings:', settingsError);
      throw settingsError;
    }

    // Transform settings array into object keyed by setting_key
    const settingsMap: Record<string, any> = {};
    (settings || []).forEach((setting) => {
      settingsMap[setting.setting_key] = {
        value: setting.setting_value,
        type: setting.setting_type,
        description: setting.description,
        isSensitive: setting.is_sensitive,
        updatedAt: setting.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      data: settingsMap
    });

  } catch (error: any) {
    console.error('[Admin Settings API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get settings to update from request body
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      );
    }

    // Update each setting
    const updates = [];
    for (const [key, data] of Object.entries(settings)) {
      const settingData = data as any;

      // Check if setting exists
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', key)
        .single();

      if (existing) {
        // Update existing setting
        const { error: updateError } = await supabase
          .from('admin_settings')
          .update({
            setting_value: settingData.value,
            setting_type: settingData.type || 'system',
            description: settingData.description,
            is_sensitive: settingData.isSensitive || false,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', key);

        if (updateError) {
          console.error(`Error updating setting ${key}:`, updateError);
          throw updateError;
        }
        updates.push({ key, action: 'updated' });
      } else {
        // Insert new setting
        const { error: insertError } = await supabase
          .from('admin_settings')
          .insert({
            setting_key: key,
            setting_value: settingData.value,
            setting_type: settingData.type || 'system',
            description: settingData.description,
            is_sensitive: settingData.isSensitive || false,
            updated_by: user.id
          });

        if (insertError) {
          console.error(`Error inserting setting ${key}:`, insertError);
          throw insertError;
        }
        updates.push({ key, action: 'created' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      updates
    });

  } catch (error: any) {
    console.error('[Admin Settings API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update admin settings' },
      { status: 500 }
    );
  }
}
