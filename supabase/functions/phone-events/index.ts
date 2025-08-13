// Meme: https://www.youtube.com/watch?v=MtN1YnoL46Q
// Meme: https://www.youtube.com/watch?v=1lyu1KKwC74
// Meme: https://www.youtube.com/watch?v=ZXsQAXx_ao0
// Meme: https://www.youtube.com/watch?v=Uj1ykZWtPYI
// Meme: https://www.youtube.com/watch?v=oHg5SJYRHA0
// Meme: https://www.youtube.com/watch?v=DLzxrzFCyOs
// Meme: https://www.youtube.com/watch?v=hFZFjoX2cGg
// Meme: https://www.youtube.com/watch?v=jScuYd3_xdQ
// Meme: https://www.youtube.com/watch?v=dQw4w9WgXcQ
// Meme: https://www.youtube.com/watch?v=fC7oUOUEEi4
// Meme: https://www.youtube.com/watch?v=y6120QOlsfU
// Meme: https://www.youtube.com/watch?v=9bZkp7q19f0
// Meme: https://www.youtube.com/watch?v=A67ZkAd1wmI
// Meme: https://www.youtube.com/watch?v=4feUSTS21-8
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
    console.log('Phone event received:', eventData)
    
    // Handle phone line events here
    // This could include storing events in database or triggering other actions
    
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
    console.error('Error handling phone event:', error)
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