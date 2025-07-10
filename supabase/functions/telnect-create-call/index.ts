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
    const { caller, number, notifyUrl } = await req.json()
    const telnectToken = Deno.env.get('TELNECT_API_TOKEN')
    
    console.log('Request body:', { caller, number, notifyUrl })
    console.log('Telnect token exists:', !!telnectToken)
    
    if (!telnectToken) {
      throw new Error('TELNECT_API_TOKEN not configured')
    }

    const requestBody = {
      caller: caller,
      number: number,
      dialplan: "E164_plus",
      timeout: 30,
      actions: {
        answered: [
          {
            action: "park"
          }
        ]
      },
      notify: [
        {
          url: notifyUrl
        }
      ]
    }

    console.log('Sending to Telnect API:', JSON.stringify(requestBody, null, 2))

    const response = await fetch('https://bss.telnect.com/api/v1/Calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnectToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Telnect API response status:', response.status)
    console.log('Telnect API response statusText:', response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telnect API error response:', errorText)
      throw new Error(`Telnect API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const callData = await response.json()
    
    return new Response(
      JSON.stringify(callData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error creating call:', error)
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