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
    const { eventCallbackUrl } = await req.json()
    const telnectToken = Deno.env.get('TELNECT_API_TOKEN')
    
    if (!telnectToken) {
      throw new Error('TELNECT_API_TOKEN not configured')
    }

    const response = await fetch('https://bss.telnect.com/api/v1/Phones', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnectToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allow_features: ["park", "inbound", "outbound", "websocket"],
        event_callback: eventCallbackUrl,
        dialplan: "SE",
        type: "dynamic",
        max_expire: 86400
      })
    })

    if (!response.ok) {
      throw new Error(`Telnect API error: ${response.statusText}`)
    }

    const phoneData = await response.json()
    
    return new Response(
      JSON.stringify(phoneData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error creating phone line:', error)
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