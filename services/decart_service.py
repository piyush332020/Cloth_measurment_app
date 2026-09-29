import os
import asyncio


async def _create_client_token_async():
    from decart import DecartClient

    api_key = os.getenv("DECART_API_KEY")

    if not api_key:
        raise RuntimeError("DECART_API_KEY is missing from .env")

    async with DecartClient(api_key=api_key) as client:
        result = await client.tokens.create()

    return {
        "apiKey": result.api_key,
        "expiresAt": str(result.expires_at),
    }


def create_client_token():
    """Create a short-lived Decart client token.

    The permanent DECART_API_KEY never leaves the Flask server.
    """
    return asyncio.run(_create_client_token_async())