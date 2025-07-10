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
    // When a call is answered and parked, we can bridge it with WebRTC
    if (eventData.status === 'answered') {
      console.log('Call answered and parked, ready for bridging:', eventData.id)
      // This is where you would trigger the bridge action in your frontend
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