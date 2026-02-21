import { redirect } from 'next/navigation';
import { getGoogleAuthURL } from '@/lib/google-calendar';

export async function GET() {
    const url = getGoogleAuthURL();
    return redirect(url);
}
