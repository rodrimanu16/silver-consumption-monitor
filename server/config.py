"""
Dual-mode authentication: works locally (Databricks CLI) and on Databricks Apps.
"""
import os

IS_DATABRICKS_APP = bool(os.environ.get("DATABRICKS_APP_NAME"))


def get_workspace_client():
    from databricks.sdk import WorkspaceClient
    if IS_DATABRICKS_APP:
        return WorkspaceClient()
    profile = os.environ.get("DATABRICKS_PROFILE", "DEFAULT")
    return WorkspaceClient(profile=profile)


def get_oauth_token() -> str:
    w = get_workspace_client()
    auth = w.config.authenticate()
    return auth.get("Authorization", "").replace("Bearer ", "")
