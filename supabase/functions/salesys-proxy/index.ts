// Meme: https://www.youtube.com/watch?v=oHg5SJYRHA0
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
    const { token } = await req.json()
    
    if (!token) {
      throw new Error('Token is required')
    }

    console.log('Getting WebSocket credentials for token:', token.substring(0, 10) + '...')

    // Get WebSocket credentials from Telnect API
    const response = await fetch('https://app.salesys.se/api/dial/easytelecom-v1/login', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telnect API error:', response.status, errorText)
      throw new Error(`Telnect API error: ${response.status} - ${errorText}`)
    }

    const credentials = await response.json()
    console.log('WebSocket credentials received:', credentials)

    return new Response(
      JSON.stringify({ success: true, data: credentials }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Function error:', error)
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
