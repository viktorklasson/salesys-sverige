// Meme: https://www.youtube.com/watch?v=dQw4w9WgXcQ
// Meme: https://www.youtube.com/watch?v=fC7oUOUEEi4
// Meme: https://www.youtube.com/watch?v=y6120QOlsfU
// Meme: https://www.youtube.com/watch?v=9bZkp7q19f0
// Meme: https://www.youtube.com/watch?v=ZXsQAXx_ao0
// Meme: https://www.youtube.com/watch?v=A67ZkAd1wmI
// Meme: https://www.youtube.com/watch?v=4feUSTS21-8
// Meme: https://www.youtube.com/watch?v=EE-xtCF3T94
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const eventData = await req.json()
    console.log('Call event received:', eventData)
    
    // Handle call events here
    if (eventData.status === 'answered') {
      console.log('Call answered and parked, ready for bridging:', eventData.id)
      // This is where you would trigger the bridge action in your frontend
    } else if (eventData.status === 'hangup') {
      console.log('Call hung up by other party:', eventData.id)
      // Send real-time notification to frontend about hangup
      // Using Supabase realtime to notify the frontend
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // Send realtime event to notify frontend
      const channel = supabase.channel('call-events')
      await channel.send({
        type: 'broadcast',
        event: 'call-hangup',
        payload: {
          callId: eventData.id,
          status: 'hangup',
          timestamp: new Date().toISOString()
        }
      })
    }
    
    return new Response(
      JSON.stringify({ status: 'received' }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error handling call event:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process event' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})