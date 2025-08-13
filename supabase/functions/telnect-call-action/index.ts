// Meme: https://www.youtube.com/watch?v=QH2-TGUlwu4
// Peak comedy: https://www.youtube.com/watch?v=gDjMZvYWUdo
// Never gets old: https://www.youtube.com/watch?v=wpV-gGA4PSk
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log('=== TELNECT CALL ACTION FUNCTION START ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('=== PARSING REQUEST BODY ===');
    const requestData = await req.json();
    console.log('Raw request data:', JSON.stringify(requestData, null, 2));
    console.log('Request data type:', typeof requestData);
    console.log('Request data keys:', Object.keys(requestData));
    
    const { callId, action, destination } = requestData;
    console.log('=== EXTRACTED PARAMETERS ===');
    console.log('Extracted callId:', callId, '(type:', typeof callId, ')');
    console.log('Extracted action:', action, '(type:', typeof action, ')');
    console.log('Extracted destination:', destination, '(type:', typeof destination, ')');

    console.log('=== ENVIRONMENT CHECK ===');
    const telnectToken = Deno.env.get('TELNECT_API_TOKEN');
    console.log('TELNECT_API_TOKEN exists:', !!telnectToken);
    console.log('TELNECT_API_TOKEN length:', telnectToken?.length || 0);
    console.log('TELNECT_API_TOKEN prefix:', telnectToken?.substring(0, 10) + '...' || 'N/A');

    if (!telnectToken) {
      console.error('ERROR: TELNECT_API_TOKEN not configured');
      throw new Error('TELNECT_API_TOKEN not configured');
    }

    console.log('=== PARAMETER VALIDATION ===');
    if (!callId) {
      console.error('ERROR: callId is required but missing');
      console.log('callId value:', callId);
      throw new Error('callId is required');
    }

    if (!action) {
      console.error('ERROR: action is required but missing');
      console.log('action value:', action);
      throw new Error('action is required');
    }

    console.log('=== PREPARING API CALL ===');
    const apiUrl = `https://bss.telnect.com/api/v1/Calls/${callId}`;
    console.log('API URL:', apiUrl);
    
    const headers = {
      'Authorization': `Bearer ${telnectToken}`,
      'Content-Type': 'application/json'
    };
    console.log('Request headers (without token):', {
      'Authorization': `Bearer ${telnectToken?.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    });

    let response;
    
    // Handle hangup action differently - use DELETE endpoint
    if (action === 'hangup') {
      console.log('=== HANDLING HANGUP ACTION ===');
      console.log('Using DELETE method for hangup');
      
      response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${telnectToken}`
        }
      });
    } else {
      // Handle other actions with POST method
      console.log('=== HANDLING OTHER ACTION ===');
      console.log('Using POST method for action:', action);
      
      // Build request body according to API docs
      const actionObj: any = { action };
      console.log('Initial action object:', JSON.stringify(actionObj, null, 2));
      
      if (destination) {
        actionObj.destination = destination;
        console.log('Added destination to action object:', JSON.stringify(actionObj, null, 2));
      }
      
      const requestBody = { actions: [actionObj] };
      console.log('Final request body for Telnect API:', JSON.stringify(requestBody, null, 2));
      console.log('Request body string length:', JSON.stringify(requestBody).length);

      console.log('=== MAKING API CALL ===');
      const requestBodyString = JSON.stringify(requestBody);
      console.log('Sending request body string:', requestBodyString);
      
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: requestBodyString
      });
    }

    console.log('=== API RESPONSE RECEIVED ===');
    console.log('Telnect API response status:', response.status);
    console.log('Telnect API response statusText:', response.statusText);
    console.log('Telnect API response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Telnect API response ok:', response.ok);
    console.log('Telnect API response type:', response.type);
    console.log('Telnect API response url:', response.url);

    if (!response.ok) {
      console.log('=== API ERROR RESPONSE ===');
      const errorText = await response.text();
      console.error('Telnect API error response body:', errorText);
      console.error('Error response length:', errorText.length);
      
      // Try to parse error as JSON for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error JSON:', JSON.stringify(errorJson, null, 2));
      } catch (parseError) {
        console.error('Could not parse error response as JSON:', parseError.message);
      }
      
      const errorMessage = `Telnect API error: ${response.status} ${response.statusText} - ${errorText}`;
      console.error('Final error message:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('=== SUCCESS RESPONSE ===');
    
    // For DELETE requests (hangup), there's usually no response body
    if (action === 'hangup' && response.status === 204) {
      console.log('Hangup successful - no content response');
      return new Response(JSON.stringify({ success: true, message: 'Call hung up successfully' }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    console.log('Response text length:', responseText.length);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Parsed response JSON:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('Could not parse success response as JSON:', parseError.message);
      console.log('Returning raw text as result');
      result = { raw_response: responseText };
    }

    console.log('=== RETURNING SUCCESS ===');
    const successResponse = JSON.stringify(result);
    console.log('Final success response:', successResponse);
    
    return new Response(successResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.log('=== EXCEPTION CAUGHT ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
    const errorResponse = {
      error: error.message,
      error_type: error.constructor.name,
      timestamp: new Date().toISOString()
    };
    
    console.log('=== RETURNING ERROR RESPONSE ===');
    console.log('Error response object:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } finally {
    console.log('=== TELNECT CALL ACTION FUNCTION END ===');
  }
});