import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const {
      parent_name,
      parent_pin,
      kid_name,
      kid_age_range,
      screen_time_limit,
      daily_story_goal,
      pet_name,
    } = body

    if (!parent_name || !kid_name || !kid_age_range) {
      return new Response(
        JSON.stringify({ error: 'parent_name, kid_name, and kid_age_range are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validAgeRanges = ['3-5', '6-8', '9-12']
    if (!validAgeRanges.includes(kid_age_range)) {
      return new Response(
        JSON.stringify({ error: 'kid_age_range must be one of: 3-5, 6-8, 9-12' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existingParent } = await supabase
      .from('profiles_v2')
      .select('profile_id')
      .eq('user_id', user.id)
      .eq('profile_type', 'parent')
      .maybeSingle()

    let parentProfile = existingParent;

    if (!parentProfile) {

      const { data, error: parentError } = await supabase
        .from('profiles_v2')
        .insert({
          user_id: user.id,
          profile_type: 'parent',
          name: parent_name.trim(),
          avatar_emoji: '👨',
          profile_order: 0,
          is_active: true,
        })
        .select()
        .single()

      if (parentError) {
        throw new Error(`Failed to create parent profile: ${parentError.message}`)
      }
      parentProfile = data;

      const { error: parentAccountError } = await supabase
        .from('parent_account')
        .insert({
          profile_id: parentProfile.profile_id,
          parental_gate_hash: parent_pin || '0000'
        })

      if (parentAccountError) {
        console.error('parent_account creation failed:', parentAccountError)
      }
    } else {

      await supabase
        .from('profiles_v2')
        .update({ name: parent_name.trim() })
        .eq('profile_id', parentProfile.profile_id)

      const { data: existingParentAccount } = await supabase
        .from('parent_account')
        .select('profile_id')
        .eq('profile_id', parentProfile.profile_id)
        .maybeSingle()

      if (existingParentAccount) {
        const { error: updateError } = await supabase
          .from('parent_account')
          .update({ parental_gate_hash: parent_pin || '0000' })
          .eq('profile_id', parentProfile.profile_id)
        
        if (updateError) console.error('parent_account update failed:', updateError)
      } else {
        const { error: insertError } = await supabase
          .from('parent_account')
          .insert({
            profile_id: parentProfile.profile_id, 
            parental_gate_hash: parent_pin || '0000' 
          })
          
        if (insertError) console.error('parent_account insert failed:', insertError)
      }
    }

    const { data: kidProfile, error: kidProfileError } = await supabase
      .from('profiles_v2')
      .insert({
        user_id: user.id,
        profile_type: 'kid',
        name: kid_name.trim(),
        avatar_emoji: '🧒',
        profile_order: 1,
        is_active: true,
      })
      .select()
      .single()

    if (kidProfileError) {
      throw new Error(`Failed to create kid profile: ${kidProfileError.message}`)
    }

    const { error: kidDetailError } = await supabase
      .from('kid_profiles')
      .insert({
        profile_id: kidProfile.profile_id,
        age_range: kid_age_range,
        reading_level: 'beginner',
        parent_profile_id: parentProfile.profile_id,
      })

    if (kidDetailError) {
      throw new Error(`Failed to create kid profile details: ${kidDetailError.message}`)
    }

    const dailyMax = screen_time_limit ?? 120
    const dayLimit = { min: 15, max: dailyMax }
    const screenTimeLimits = {
      mon: dayLimit,
      tue: dayLimit,
      wed: dayLimit,
      thu: dayLimit,
      fri: dayLimit,
      sat: dayLimit,
      sun: dayLimit,
    }

    const weeklyGoal = (daily_story_goal ?? 2) * 7

    const { error: settingsError } = await supabase
      .from('kid_settings')
      .insert({
        profile_id: kidProfile.profile_id,
        screen_time_limits: screenTimeLimits,
        weekly_stories_goal: weeklyGoal,
      })

    if (settingsError) {
      console.error('kid_settings creation failed:', settingsError)
    }

    const { error: petError } = await supabase
      .from('pet_stats')
      .insert({
        user_id: user.id,
        pet_name: (pet_name ?? 'Chotuu').trim(),
        xp: 0,
        level: 1,
        evolution_stage: 'egg',
      })

    if (petError) {
      console.error('pet_stats creation failed:', petError)
    }

    return new Response(
      JSON.stringify({
        message: 'Account setup complete!',
        parent_profile: parentProfile,
        kid_profile: kidProfile,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('setup-account error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
