"""
Jupsoft CMS & Infinity Scraper Unified OpenAPI & FastMCP Server
Exposes 77 tools (52 Jupsoft CMS Super Admin Tools + 25 Infinity Scraper / OSINT Tools)
on Port 7367 with full OpenAPI 3.1.0 JSON support and MCP SSE transport.

Author: Jupsoft Systems & VirajVerse
"""

import os
import sys
import inspect
import asyncio
import argparse
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import create_model

# -----------------------------------------------------------------------------
# 1. Path Resolution: Include both Jupsoft CMS and Infinity Scraper in sys.path
# -----------------------------------------------------------------------------
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
CMS_SRC = WORKSPACE_ROOT / "jupsoft-centralized-blog-platform" / "jupsoft-cms-mcp" / "src"
INF_SRC = WORKSPACE_ROOT / "infinity-scraper-main" / "src"

for p in [CMS_SRC, INF_SRC]:
    if p.exists() and str(p) not in sys.path:
        sys.path.insert(0, str(p))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Import FastMCP instances from both modules
from jupsoft_cms.server import mcp as cms_mcp
from infinity_scraper.server import mcp as inf_mcp
from mcp.server.fastmcp import FastMCP

# -----------------------------------------------------------------------------
# 2. Build Unified FastMCP (for MCP SSE / JSON-RPC Clients)
# -----------------------------------------------------------------------------
unified_mcp = FastMCP(
    "Jupsoft-Infinity-Unified",
    instructions=(
        "Unified Super Suite: 52 Jupsoft Centralized CMS Multi-Tenant Admin Tools "
        "and 25 Infinity Scrape / Web Intelligence / OSINT Tools."
    ),
    host="0.0.0.0",
    port=7367,
)

# Register CMS tools
for t in cms_mcp._tool_manager.list_tools():
    try:
        unified_mcp.add_tool(t.fn, name=t.name, description=t.description)
    except Exception:
        pass

# Register Infinity Scraper tools
for t in inf_mcp._tool_manager.list_tools():
    try:
        unified_mcp.add_tool(t.fn, name=t.name, description=t.description)
    except Exception:
        pass

# -----------------------------------------------------------------------------
# 3. Build FastAPI App with OpenAPI 3.1.0 Support
# -----------------------------------------------------------------------------
app = FastAPI(
    title="Jupsoft CMS & Infinity Scrape Unified Server",
    description=(
        "Production-grade OpenAPI & MCP Tool Server exposing 77 AI Agent tools:\n\n"
        "• **52 Jupsoft CMS Tools**: Multi-tenant websites, blogs, publishing, taxonomy, media, users, redirects, audit logs, analytics.\n"
        "• **25 Infinity Scrape Tools**: Headless browsing, dynamic SPA rendering, YouTube transcription, deep crawling, RAG chunking, OSINT & GEOINT.\n\n"
        "**Compatibility**: Works out of the box with Open WebUI, Antigravity, Claude Desktop, Cursor, ChatGPT Actions, and Postman."
    ),
    version="3.0.0",
    servers=[
        {"url": "/", "description": "Local Unified Server"}
    ],
    openapi_tags=[
        {"name": "Jupsoft CMS [52 Tools]", "description": "Super Admin operations across all tenant websites"},
        {"name": "Infinity Scrape [25 Tools]", "description": "Web scraping, search, intelligence, and OSINT tools"},
    ],
)

# CORS: Allow all origins so Open WebUI / local AI tools can connect seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def register_endpoint(tool, category_tag: str):
    """Dynamically registers an MCP tool function as a typed FastAPI POST endpoint."""
    fn = tool.fn
    sig = inspect.signature(fn)
    tool_name = tool.name
    doc = tool.description or f"Execute {tool_name}"

    if not sig.parameters:
        async def no_param_handler():
            try:
                if inspect.iscoroutinefunction(fn):
                    return await asyncio.wait_for(fn(), timeout=120.0)
                return await asyncio.wait_for(asyncio.to_thread(fn), timeout=120.0)
            except asyncio.TimeoutError:
                return {"error": f"Tool '{tool_name}' timed out after 120s"}
            except Exception as e:
                return {"error": f"Tool execution failed: {str(e)}"}

        no_param_handler.__name__ = tool_name
        app.post(f"/{tool_name}", summary=tool_name, description=doc, tags=[category_tag])(no_param_handler)
        app.get(f"/{tool_name}", summary=tool_name, description=doc, tags=[category_tag])(no_param_handler)
        return

    fields = {}
    for name, param in sig.parameters.items():
        ann = param.annotation if param.annotation != inspect.Parameter.empty else Any
        default = param.default if param.default != inspect.Parameter.empty else ...
        fields[name] = (ann, default)

    PayloadModel = create_model(f"{tool_name}_Payload", **fields)

    async def param_handler(payload: PayloadModel):
        kwargs = payload.model_dump(exclude_unset=False)
        filtered = {k: v for k, v in kwargs.items() if k in sig.parameters}
        try:
            if inspect.iscoroutinefunction(fn):
                return await asyncio.wait_for(fn(**filtered), timeout=120.0)
            return await asyncio.wait_for(asyncio.to_thread(fn, **filtered), timeout=120.0)
        except asyncio.TimeoutError:
            return {"error": f"Tool '{tool_name}' timed out after 120s"}
        except Exception as e:
            return {"error": f"Tool execution failed: {str(e)}"}

    param_handler.__name__ = tool_name
    app.post(f"/{tool_name}", summary=tool_name, description=doc, tags=[category_tag])(param_handler)


# Register all CMS Tools
for t in cms_mcp._tool_manager.list_tools():
    register_endpoint(t, "Jupsoft CMS [52 Tools]")

# Register all Infinity Scraper Tools
for t in inf_mcp._tool_manager.list_tools():
    register_endpoint(t, "Infinity Scrape [25 Tools]")


# -----------------------------------------------------------------------------
# 4. Standard Health, Discovery, and Open WebUI Compatibility Routes
# -----------------------------------------------------------------------------
@app.get("/")
def root():
    cms_tools = [t.name for t in cms_mcp._tool_manager.list_tools()]
    inf_tools = [t.name for t in inf_mcp._tool_manager.list_tools()]
    return {
        "status": "online",
        "service": "Jupsoft CMS & Infinity Scrape Unified Server",
        "port": 7367,
        "total_tools": len(cms_tools) + len(inf_tools),
        "cms_tools_count": len(cms_tools),
        "infinity_tools_count": len(inf_tools),
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
        "sse_mcp_url": "/mcp/sse",
        "cms_tools": cms_tools,
        "infinity_tools": inf_tools,
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "jupsoft-unified-mcp", "port": 7367}


# Open WebUI path tolerance aliases
@app.get("/openapi.json/openapi.json")
def openapi_double_alias():
    return JSONResponse(content=app.openapi())


@app.get("/api/config")
def api_config():
    return {"status": "ok", "service": "jupsoft-unified-mcp", "port": 7367}


# Mount FastMCP SSE Application under /mcp
try:
    sse_app = unified_mcp.sse_app()
    app.mount("/mcp", sse_app)
except Exception as e:
    print(f"Note: FastMCP SSE mount skipped ({e}), pure OpenAPI endpoints active.")


def main():
    parser = argparse.ArgumentParser(description="Jupsoft CMS & Infinity Scrape Unified OpenAPI Server")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "7367")), help="Port to listen on (default: 7367)")
    parser.add_argument("--host", type=str, default=os.environ.get("HOST", "0.0.0.0"), help="Host IP to bind to (default: 0.0.0.0)")
    args = parser.parse_args()

    print("\n" + "=" * 65)
    print(f"🚀 Jupsoft CMS & Infinity Scraper Unified Server")
    print(f"📡 Running on: http://127.0.0.1:{args.port}")
    print(f"📄 OpenAPI JSON: http://127.0.0.1:{args.port}/openapi.json")
    print(f"📖 Swagger Docs:  http://127.0.0.1:{args.port}/docs")
    print(f"⚡ FastMCP SSE:   http://127.0.0.1:{args.port}/mcp/sse")
    print(f"🛠️  Total Tools:   77 (52 CMS + 25 Infinity Scraper)")
    print("=" * 65 + "\n")

    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
