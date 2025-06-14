
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true'
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

    console.log('Proxying request to:', url, 'with method:', method)

    // Forward the request to the target URL
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      credentials: 'include'
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)
    const responseData = await response.text()

    console.log('Response status:', response.status)
    console.log('Response data:', responseData)

    // Get cookies from the response - use both methods for compatibility
    let setCookieHeaders: string[] = []
    
    // Try the newer getSetCookie method first
    if (response.headers.getSetCookie) {
      setCookieHeaders = response.headers.getSetCookie()
    } else {
      // Fallback to manual extraction
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          setCookieHeaders.push(value)
        }
      })
    }
    
    console.log('Original Set-Cookie headers:', setCookieHeaders)
    
    // Prepare response headers
    const responseHeaders = new Headers({
      ...corsHeaders,
      'Content-Type': response.headers.get('content-type') || 'application/json'
    })

    // Process and forward Set-Cookie headers with proper domain settings
    setCookieHeaders.forEach(cookie => {
      console.log('Processing cookie:', cookie)
      
      // Modify cookie to work with our domain
      let modifiedCookie = cookie
      
      // Remove domain restrictions that might prevent cookie setting
      modifiedCookie = modifiedCookie.replace(/;\s*Domain=[^;]+/gi, '')
      
      // Remove Secure flag if present (since we might be on http in development)
      modifiedCookie = modifiedCookie.replace(/;\s*Secure/gi, '')
      
      // Add SameSite=None for cross-origin requests
      if (!modifiedCookie.includes('SameSite')) {
        modifiedCookie += '; SameSite=None'
      }
      
      console.log('Modified cookie:', modifiedCookie)
      responseHeaders.append('Set-Cookie', modifiedCookie)
    })

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
