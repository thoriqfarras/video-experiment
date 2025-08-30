export async function GET() {
  return Response.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
    nodeEnv: process.env.NODE_ENV,
    supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    serviceRoleKeyPreview: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...',
  });
}
