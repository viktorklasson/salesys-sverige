// Meme: https://www.youtube.com/watch?v=oHg5SJYRHA0
// Meme: https://www.youtube.com/watch?v=uSD4vsh1zDA
// Meme: https://www.youtube.com/watch?v=04F4xlWSFh0
// Meme: https://www.youtube.com/watch?v=FzRH3iTQPrk
// Meme: https://www.youtube.com/watch?v=WTWyosdkx44
// Meme: https://www.youtube.com/watch?v=jltKnDlH_OA
// Meme: https://www.youtube.com/watch?v=hiRacdl02w4
// Meme: https://www.youtube.com/watch?v=zBJU9ndpH1Q
// Meme: https://www.youtube.com/watch?v=B1J6Ou4q8vE
// Meme: https://www.youtube.com/watch?v=bjPqsDU0j2I
// Meme: https://www.youtube.com/watch?v=P-3GOo_nWoc
// Meme: https://www.youtube.com/watch?v=L_jWHffIx5E
// Meme: https://www.youtube.com/watch?v=BROWqjuTM0g
// Meme: https://www.youtube.com/watch?v=ZTgVPzZJQvY
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

    // Get cookies from the response
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
    
    // Extract the bearer token from cookies
    let bearerToken = null
    setCookieHeaders.forEach(cookie => {
      if (cookie.startsWith('s2_utoken=')) {
        const tokenMatch = cookie.match(/s2_utoken=([^;]+)/)
        if (tokenMatch) {
          bearerToken = tokenMatch[1]
          console.log('Extracted bearer token:', bearerToken.substring(0, 20) + '...')
        }
      }
    })

    // Prepare response headers
    const responseHeaders = new Headers({
      ...corsHeaders,
      'Content-Type': response.headers.get('content-type') || 'application/json'
    })

    // Still try to set cookies for compatibility
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

    // Return response with bearer token included in the response body for login requests
    let finalResponseData = responseData
    if (bearerToken && url.includes('/login')) {
      console.log('Including bearer token in response data for login request')
      finalResponseData = JSON.stringify({
        status: responseData,
        bearerToken: bearerToken
      })
    }

    return new Response(finalResponseData, {
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
