# --- core/base_module.py ---
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class ServiceModule(ABC):
    # Unique identifier for the module
    module_id: str
    # User-friendly name
    module_name: str
    # Category (e.g., "subdomain", "voip", "hosting")
    category: str
    # Description of the service
    description: str
    # Fields required for configuration (e.g., ["api_key", "username"])
    required_config_fields: List[str]

    def __init__(self, user_config: Dict[str, Any]):
        self.config = user_config # User-specific API keys, settings

    @abstractmethod
    async def connect(self) -> bool:
        """Test connection or perform initial setup."""
        pass

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Return current status, limits, etc."""
        pass

    @abstractmethod
    async def perform_action(self, action_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform a generic action. Not always ideal, better to have specific methods."""
        pass

    def get_info(self) -> Dict[str, Any]:
        return {
            "id": self.module_id,
            "name": self.module_name,
            "category": self.category,
            "description": self.description,
            "required_fields": self.required_config_fields
        }

class ISubdomainProvider(ServiceModule):
    category = "subdomain"

    @abstractmethod
    async def list_records(self, domain_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def create_record(self, subdomain: str, record_type: str, content: str, ttl: int = 300) -> bool:
        pass

    @abstractmethod
    async def delete_record(self, record_id: str) -> bool: # Or by name/type
        pass

# --- modules/subdomain_duckdns.py ---
import httpx # Modern async HTTP client

# This is a simplified, hypothetical DuckDNS client.
# DuckDNS actual API is very simple: https://www.duckdns.org/spec.jsp
class DuckDNSModule(ISubdomainProvider):
    module_id = "duckdns_subdomain"
    module_name = "DuckDNS Subdomain"
    description = "Provides free subdomains under duckdns.org."
    # DuckDNS requires a token and the domain you want to manage
    required_config_fields = ["token", "domain_to_manage"] # e.g., your_chosen_name.duckdns.org

    async def connect(self) -> bool:
        # DuckDNS doesn't have a "connect" endpoint, updating IP serves as a check
        try:
            # A real connect might just verify token format or try a dummy update
            async with httpx.AsyncClient() as client:
                # This is a simplified check; a real one would be more involved
                # For example, update with current IP to see if token is valid
                # For now, we just assume if config is present, it's "connected"
                if self.config.get("token") and self.config.get("domain_to_manage"):
                    print(f"DuckDNS configured for domain: {self.config['domain_to_manage']}")
                    return True
            return False
        except Exception as e:
            print(f"DuckDNS connection failed: {e}")
            return False

    async def get_status(self) -> Dict[str, Any]:
        # DuckDNS doesn't really provide a status or list of records via its simple API
        # It's primarily for updating your IP.
        # For this conceptual example, we'll fake it.
        # A real module might involve scraping the user's account page (brittle!).
        return {
            "domain": self.config.get("domain_to_manage"),
            "last_ip": "unknown (fetch required)",
            "limits": "5 subdomains per token. Updates rate limited."
        }

    async def list_records(self, domain_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        # DuckDNS API is too simple for this. You typically manage one main domain (your_name.duckdns.org)
        # and can have TXT records, but not multiple A/CNAME like a full DNS provider.
        # This is where the abstraction meets reality of free service limitations.
        # For this example, we assume the "domain_to_manage" is the only record.
        domain = self.config.get("domain_to_manage")
        if domain:
            return [{
                "id": domain, # No real ID from DuckDNS simple API
                "name": domain,
                "type": "A", # Or could be based on last update
                "content": "Queried via update with no IP", # Placeholder
                "ttl": 300 # Default DuckDNS TTL
            }]
        return []

    async def create_record(self, subdomain: str, record_type: str, content: str, ttl: int = 300) -> bool:
        # DuckDNS main use is updating the IP for `self.config.get("domain_to_manage")`.
        # It supports TXT records. It does not support arbitrary sub-subdomains easily.
        # Let's assume `subdomain` is the full domain like `mycoolapp.duckdns.org`
        # and `content` is the IP address for an A record.
        # `record_type` is often implicitly 'A' or 'AAAA' based on IP, or 'TXT'.

        token = self.config.get("token")
        domain_to_update = self.config.get("domain_to_manage") # e.g., myapp.duckdns.org

        if not token or not domain_to_update:
            print("Token or domain_to_manage not configured for DuckDNS.")
            return False

        # For simplicity, assume subdomain passed is the one we manage
        if subdomain != domain_to_update:
             print(f"DuckDNS module configured for {domain_to_update}, cannot create for {subdomain} directly this way.")
             # In a real scenario, you might use this to update TXT records if `record_type` is TXT
             # and `subdomain` matches `domain_to_manage`.
             return False

        params = {
            "domains": domain_to_update.replace(".duckdns.org", ""), # DuckDNS expects only the name part
            "token": token,
        }
        if record_type.upper() == "A" and content: # Content is the IP
            params["ip"] = content
        elif record_type.upper() == "TXT" and content:
            params["txt"] = content
        else: # Auto-detect IP if content is empty for A record
            params["ip"] = "" # Let DuckDNS auto-detect sender's IP

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("https://www.duckdns.org/update", params=params)
                response.raise_for_status() # Raise an exception for HTTP errors
                if response.text.strip().upper() == "OK":
                    print(f"DuckDNS record for {domain_to_update} updated/created with content hinting '{content}'.")
                    return True
                else:
                    print(f"DuckDNS update failed: {response.text}")
                    return False
            except httpx.HTTPStatusError as e:
                print(f"DuckDNS HTTP error: {e.response.status_code} - {e.response.text}")
                return False
            except Exception as e:
                print(f"DuckDNS request error: {e}")
                return False

    async def delete_record(self, record_id: str) -> bool:
        # DuckDNS: to "delete" an A record, you clear its IP.
        # You can't truly delete the `your_name.duckdns.org` domain itself via this API.
        # This method for DuckDNS would likely mean setting the IP to empty.
        token = self.config.get("token")
        domain_to_clear = self.config.get("domain_to_manage")

        if not token or not domain_to_clear:
            return False
        
        # If record_id is the domain we are managing.
        if record_id != domain_to_clear:
            print(f"DuckDNS cannot delete arbitrary record_id '{record_id}', can only clear '{domain_to_clear}'")
            return False

        params = {
            "domains": domain_to_clear.replace(".duckdns.org", ""),
            "token": token,
            "ip": "", # Clearing the IP
            "clear": "true" # Explicitly clear
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("https://www.duckdns.org/update", params=params)
                response.raise_for_status()
                if response.text.strip().upper() == "OK":
                    print(f"DuckDNS record for {domain_to_clear} cleared.")
                    return True
                else:
                    print(f"DuckDNS clear failed: {response.text}")
                    return False
            except Exception as e:
                print(f"DuckDNS clear error: {e}")
                return False

    async def perform_action(self, action_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        if action_name == "update_ip": # Specific to DuckDNS
            ip_to_set = params.get("ip", "") # Empty means auto-detect
            success = await self.create_record(
                subdomain=self.config.get("domain_to_manage"),
                record_type="A", # Assuming A record update
                content=ip_to_set
            )
            return {"success": success, "message": f"IP update for {self.config.get('domain_to_manage')} {'succeeded' if success else 'failed'}"}
        raise NotImplementedError(f"Action '{action_name}' not implemented for DuckDNS.")

# --- main_app.py (FastAPI example) ---
from fastapi import FastAPI, HTTPException, Body
from typing import List, Dict, Any
# For simplicity, an in-memory store for modules and user configs
# In production: use a DB and secure credential storage
# Also, a proper module discovery and loading mechanism.

# Assume modules are manually registered for this example
REGISTERED_MODULE_CLASSES = {
    "duckdns_subdomain": DuckDNSModule
}
# User configurations (in-memory, replace with DB + encrypted storage)
# Structure: { "user_id": { "service_instance_id": {"module_id": "...", "config": {...} } } }
USER_SERVICE_INSTANCES = {}
# For simplicity, use a default user_id
DEFAULT_USER_ID = "user123"
if DEFAULT_USER_ID not in USER_SERVICE_INSTANCES:
    USER_SERVICE_INSTANCES[DEFAULT_USER_ID] = {}

app = FastAPI(title="Free Services Hub")

@app.get("/modules", summary="List available service modules")
async def list_modules() -> List[Dict[str, Any]]:
    module_infos = []
    for module_id, module_class in REGISTERED_MODULE_CLASSES.items():
        # Instantiate with empty config just to get info
        # A better way would be to have static methods/properties on the class
        try:
            info = module_class(user_config={}).get_info() # Requires dummy instantiation
            module_infos.append(info)
        except Exception: # Catch if constructor needs args we don't have for get_info
             module_infos.append({
                "id": getattr(module_class, 'module_id', 'unknown'),
                "name": getattr(module_class, 'module_name', 'Unknown Module'),
                "category": getattr(module_class, 'category', 'general'),
                "description": getattr(module_class, 'description', ''),
                "required_fields": getattr(module_class, 'required_config_fields', [])
            })
    return module_infos

@app.post("/connect-service", summary="Connect/configure a service for a user")
async def connect_service(
    service_instance_id: str, # User-defined ID for this instance
    module_id: str,
    config: Dict[str, Any] = Body(...)
):
    user_id = DEFAULT_USER_ID # Hardcoded for simplicity
    if module_id not in REGISTERED_MODULE_CLASSES:
        raise HTTPException(status_code=404, detail="Module not found")

    module_class = REGISTERED_MODULE_CLASSES[module_id]
    # Validate required fields
    for field in module_class.required_config_fields:
        if field not in config:
            raise HTTPException(status_code=400, detail=f"Missing required config field: {field}")

    # In real app: Encrypt sensitive parts of 'config' before storing
    USER_SERVICE_INSTANCES[user_id][service_instance_id] = {
        "module_id": module_id,
        "config": config # Store securely!
    }
    
    # Attempt to connect/validate
    try:
        service_module = module_class(user_config=config)
        connected = await service_module.connect()
        if not connected:
            # Potentially remove from USER_SERVICE_INSTANCES if connect fails and is critical
            # Or just return a warning
            return {"message": f"Service '{service_instance_id}' configured, but initial connection/validation failed.", "instance_id": service_instance_id, "connected_status": False}
        return {"message": f"Service '{service_instance_id}' connected successfully.", "instance_id": service_instance_id, "connected_status": True}
    except Exception as e:
        # Log the error
        # Potentially remove from USER_SERVICE_INSTANCES
        raise HTTPException(status_code=500, detail=f"Error connecting service: {str(e)}")


@app.get("/services/{service_instance_id}/status", summary="Get status of a connected service")
async def get_service_status(service_instance_id: str):
    user_id = DEFAULT_USER_ID
    instance_data = USER_SERVICE_INSTANCES.get(user_id, {}).get(service_instance_id)
    if not instance_data:
        raise HTTPException(status_code=404, detail="Service instance not found")

    module_class = REGISTERED_MODULE_CLASSES[instance_data["module_id"]]
    # In real app: Decrypt sensitive parts of config if needed by module
    service_module = module_class(user_config=instance_data["config"])
    try:
        return await service_module.get_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")


@app.post("/services/{service_instance_id}/actions/{action_name}", summary="Perform an action on a service")
async def perform_service_action(service_instance_id: str, action_name: str, params: Dict[str, Any] = Body(None)):
    user_id = DEFAULT_USER_ID
    instance_data = USER_SERVICE_INSTANCES.get(user_id, {}).get(service_instance_id)
    if not instance_data:
        raise HTTPException(status_code=404, detail="Service instance not found")

    module_class = REGISTERED_MODULE_CLASSES[instance_data["module_id"]]
    service_module = module_class(user_config=instance_data["config"])
    
    # Try generic perform_action first
    try:
        if hasattr(service_module, action_name) and callable(getattr(service_module, action_name)):
             # If the action is a specific method on the module (e.g., create_record)
            method_to_call = getattr(service_module, action_name)
            # This is a simplification; inspect method signature for proper arg passing
            if params:
                return await method_to_call(**params)
            else:
                return await method_to_call()
        else: # Fallback to generic perform_action if it exists
            return await service_module.perform_action(action_name, params or {})
    except NotImplementedError:
        raise HTTPException(status_code=400, detail=f"Action '{action_name}' not implemented or not a direct method for this module.")
    except Exception as e:
        # Log full error
        print(f"Error performing action '{action_name}' on '{service_instance_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Error performing action: {str(e)}")

# Example for ISubdomainProvider specific endpoint
@app.post("/services/subdomain/{service_instance_id}/create-record", summary="Create a subdomain record")
async def create_subdomain_record_action(
    service_instance_id: str,
    subdomain: str = Body(...),
    record_type: str = Body(...),
    content: str = Body(...),
    ttl: Optional[int] = Body(300)
):
    user_id = DEFAULT_USER_ID
    instance_data = USER_SERVICE_INSTANCES.get(user_id, {}).get(service_instance_id)
    if not instance_data:
        raise HTTPException(status_code=404, detail="Service instance not found")

    module_class = REGISTERED_MODULE_CLASSES[instance_data["module_id"]]
    if not issubclass(module_class, ISubdomainProvider):
        raise HTTPException(status_code=400, detail="Service is not a subdomain provider")
    
    provider_module: ISubdomainProvider = module_class(user_config=instance_data["config"])
    try:
        success = await provider_module.create_record(subdomain, record_type, content, ttl)
        return {"success": success, "message": f"Record creation for {subdomain} {'succeeded' if success else 'failed'}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating record: {str(e)}")

# To run (save as main_app.py, ensure httpx is installed: pip install fastapi uvicorn httpx):
# uvicorn main_app:app --reload