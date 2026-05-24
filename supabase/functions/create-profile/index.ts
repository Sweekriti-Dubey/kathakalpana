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
      name,
      avatar_emoji,
      age_range,
      birth_year,
      reading_level,
      screen_time_limit,
      daily_story_goal,
      pet_name,
    } = body

    if (!name || !age_range) {
      return new Response(
        JSON.stringify({ error: 'name and age_range are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validAgeRanges = ['3-5', '6-8', '9-12']
    if (!validAgeRanges.includes(age_range)) {
      return new Response(
        JSON.stringify({ error: 'age_range must be one of: 3-5, 6-8, 9-12' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: parentProfile } = await supabase
      .from('profiles_v2')
      .select('profile_id')
      .eq('user_id', user.id)
      .eq('profile_type', 'parent')
      .single()

    if (!parentProfile) {
      return new Response(
        JSON.stringify({ error: 'Parent profile not found. Complete account setup first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { count } = await supabase
      .from('profiles_v2')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data: newProfile, error: profileError } = await supabase
      .from('profiles_v2')
      .insert({
        user_id: user.id,
        profile_type: 'kid',
        name: name.trim(),
        avatar_emoji: avatar_emoji || '🧒',
        profile_order: count || 0,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) throw profileError

    const { error: kidError } = await supabase
      .from('kid_profiles')
      .insert({
        profile_id: newProfile.profile_id,
        birth_year: birth_year || null,
        age_range: age_range,
        reading_level: reading_level || 'beginner',
        parent_profile_id: parentProfile.profile_id,
      })

    if (kidError) throw kidError

    const dailyMax = screen_time_limit ?? 120
    const dayLimit = { min: 15, max: dailyMax }
    const screenTimeLimits = {
      mon: dayLimit, tue: dayLimit, wed: dayLimit, thu: dayLimit,
      fri: dayLimit, sat: dayLimit, sun: dayLimit,
    }

    const weeklyGoal = (daily_story_goal ?? 2) * 7

    const { error: settingsError } = await supabase
      .from('kid_settings')
      .insert({
        profile_id: newProfile.profile_id,
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
      console.error('Pet creation failed:', petError)
    }

    return new Response(JSON.stringify(newProfile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('create-profile error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
