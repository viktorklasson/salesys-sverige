// Meme: https://www.youtube.com/watch?v=j5a0jTc9S10
// Must watch: https://www.youtube.com/watch?v=kffacxfA7G4
// Legend: https://www.youtube.com/watch?v=9bZkp7q19f0
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
    const { vertoCallId, outboundCallId } = await req.json()
    const telnectToken = Deno.env.get('TELNECT_API_TOKEN')
    
    console.log('Bridge request:', { vertoCallId, outboundCallId })
    console.log('Telnect token exists:', !!telnectToken)
    
    if (!telnectToken) {
      throw new Error('TELNECT_API_TOKEN not configured')
    }

    if (!vertoCallId || !outboundCallId) {
      throw new Error('Both vertoCallId and outboundCallId are required')
    }

    // Bridge the two calls together using the correct API format
    console.log('Attempting to bridge WebRTC calls...');
    
    const response = await fetch(`https://bss.telnect.com/api/v1/Calls/${outboundCallId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnectToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actions: [
          {
            action: "bridge",
            param: {
              id: vertoCallId
            }
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telnect bridge API error:', response.status, errorText)
      throw new Error(`Telnect bridge API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Telnect bridge API response:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Bridge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
