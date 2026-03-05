"""
Foundation Model API client — dual-mode auth.
Works locally (Databricks CLI profile) and on Databricks Apps (service principal).
"""
import os
from openai import AsyncOpenAI


def _get_token_and_host() -> tuple[str, str]:
    """Return (token, host) for the current environment."""
    if os.environ.get("DATABRICKS_APP_NAME"):
        # Running inside Databricks Apps — service principal creds are auto-injected.
        # DATABRICKS_HOST is just the hostname without scheme.
        host = os.environ.get("DATABRICKS_HOST", "")
        if host and not host.startswith("http"):
            host = f"https://{host}"
        token = os.environ.get("DATABRICKS_TOKEN", "")
        if not token:
            # Fallback: use SDK to get token
            from databricks.sdk import WorkspaceClient
            w = WorkspaceClient()
            auth = w.config.authenticate()
            token = auth.get("Authorization", "").replace("Bearer ", "")
        return token, host
    else:
        # Local development — use Databricks CLI profile
        from databricks.sdk import WorkspaceClient
        profile = os.environ.get("DATABRICKS_PROFILE", "DEFAULT")
        w = WorkspaceClient(profile=profile)
        auth = w.config.authenticate()
        token = auth.get("Authorization", "").replace("Bearer ", "")
        host = w.config.host
        return token, host


def get_llm_client() -> AsyncOpenAI:
    token, host = _get_token_and_host()
    return AsyncOpenAI(
        api_key=token,
        base_url=f"{host}/serving-endpoints",
    )


SERVING_ENDPOINT = os.environ.get("SERVING_ENDPOINT", "databricks-claude-sonnet-4-5")
