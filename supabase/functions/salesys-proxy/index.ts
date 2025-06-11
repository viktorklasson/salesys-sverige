
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
    const { url, method = 'GET', data, headers = {} } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Forward the request to the target URL
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)
    const responseData = await response.text()

    // Forward cookies from the response
    const setCookieHeaders = response.headers.getSetCookie?.() || []
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': response.headers.get('content-type') || 'application/json'
    }

    // Add Set-Cookie headers if they exist
    if (setCookieHeaders.length > 0) {
      setCookieHeaders.forEach((cookie, index) => {
        responseHeaders[`Set-Cookie${index > 0 ? `-${index}` : ''}`] = cookie
      })
    }

    return new Response(responseData, {
      status: response.status,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ error: 'Proxy request failed', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
