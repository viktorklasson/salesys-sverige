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
    const { callId, actions } = await req.json()
    const telnectToken = Deno.env.get('TELNECT_API_TOKEN')
    
    console.log('Call action request:', { callId, actions })
    
    if (!telnectToken) {
      throw new Error('TELNECT_API_TOKEN not configured')
    }

    console.log('Sending actions to Telnect API:', JSON.stringify(actions, null, 2))

    const response = await fetch(`https://bss.telnect.com/api/v1/Calls/${callId}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnectToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actions)
    })

    console.log('Telnect API response status:', response.status)
    console.log('Telnect API response statusText:', response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telnect API error response:', errorText)
      throw new Error(`Telnect API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error executing call action:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
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