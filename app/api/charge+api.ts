import Payjp from 'payjp';

const PAYJP_SECRET = process.env.PAYJP_SECRET;

type PayjpError = {
    response: {
        status: number;
        error: {
            charge: string;
            code: string;
            message: string;
            param: string;
            status: number;
            type: string;
        }
    };
};

export async function POST(request: Request) {
    const body = await request.json();

    if (!PAYJP_SECRET) {
        return Response.json({ error: 'PAYJP_SECRET is not defined. Please set it in .env' });
    }
    const payjp = Payjp(PAYJP_SECRET);
    try {
        const charge = await payjp.charges.retrieve(body.cid);
        console.log({ charge });
        return Response.json({ charge });
    } catch (error) {
        console.error(error);
        if ((error as PayjpError).response) {
            const payjpError = error as PayjpError;
            return new Response(JSON.stringify({ error: payjpError.response.error.message }), { status: payjpError.response.status });
        }

        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}