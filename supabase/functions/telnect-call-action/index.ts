import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const requestData = await req.json();
    console.log('Raw request data:', JSON.stringify(requestData, null, 2));
    
    const { callId, action, destination } = requestData;
    const telnectToken = Deno.env.get('TELNECT_API_TOKEN');

    console.log('Extracted callId:', callId);
    console.log('Extracted action:', action);
    console.log('Extracted destination:', destination);

    if (!telnectToken) {
      throw new Error('TELNECT_API_TOKEN not configured');
    }

    if (!callId) {
      throw new Error('callId is required');
    }

    if (!action) {
      throw new Error('action is required');
    }

    // Build request body according to corrected API docs
    const actionObj: any = { action };
    if (destination) {
      actionObj.destination = destination;
    }
    
    const requestBody = { actions: [actionObj] };
    console.log('Final request body for Telnect API:', JSON.stringify(requestBody, null, 2));

    // CORRECTED: Use endpoint without /actions as per corrected API docs
    const response = await fetch(`https://bss.telnect.com/api/v1/Calls/${callId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnectToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Telnect API response status:', response.status);
    console.log('Telnect API response statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telnect API error response:', errorText);
      throw new Error(`Telnect API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error executing call action:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});