# Dev Server Makefile Template — native-daemon pattern
#
# Copy this into your project root as `Makefile` and adjust ENTRY_POINT and SERVICE_NAME.
# Provides: make dev | make stop | make restart | make status | make logs | make health
#
# Pattern:  stop → find-port → start (bun --hot) → tailscale-serve → health-check
# Features: PID tracking (.state/), dynamic port allocation, tailscale HTTPS, orphan cleanup
#
# Reference implementation: ~/local/projects/sports-dashboard/Makefile
# Backlog: service-dashboard #023, sports-dashboard #035

SHELL := /bin/bash
.ONESHELL:
.PHONY: dev stop restart status logs health clear-cache _register

# --- Config (EDIT THESE) ---
SERVICE_NAME  := how-many-stars
ENTRY_POINT   := src/server.ts
DASHBOARD_ROOT ?= $(HOME)/local/projects/service-dashboard
EXTERNAL_PORT ?= 5006

# --- Config (usually fine as-is) ---
STATE_DIR     := .state
PID_FILE      := $(STATE_DIR)/server.pid
PORT_FILE     := $(STATE_DIR)/server.port
LOG_FILE      := $(STATE_DIR)/server.log
PORT_MIN      := 9000
PORT_MAX      := 9099
HEALTH_PATH   := /api/health

# --- Primary targets ---

dev: stop _find_port _start _tailscale _health _register  ## Kill existing, allocate port, start, publish
	@echo "$(SERVICE_NAME) running on port $$(cat $(PORT_FILE)) → https://the-commons.taila8bee6.ts.net:$(EXTERNAL_PORT)"

stop:  ## Gracefully stop the server
	@mkdir -p $(STATE_DIR)
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "Stopping $(SERVICE_NAME) (PID $$PID)..."; \
			kill $$PID 2>/dev/null; \
			for i in $$(seq 1 10); do \
				kill -0 $$PID 2>/dev/null || break; \
				sleep 0.5; \
			done; \
			if kill -0 $$PID 2>/dev/null; then \
				echo "Force-killing PID $$PID"; \
				kill -9 $$PID 2>/dev/null; \
			fi; \
			echo "Stopped"; \
		else \
			echo "PID $$PID not running (stale PID file)"; \
		fi; \
		rm -f $(PID_FILE); \
	fi
	@# Kill orphaned bun processes for this project
	@for p in $$(pgrep -x bun 2>/dev/null); do \
		if ls -l /proc/$$p/cwd 2>/dev/null | grep -q "$(CURDIR)"; then \
			echo "Killing orphaned bun process $$p"; \
			kill $$p 2>/dev/null || true; \
		fi; \
	done; true
	@bun $(DASHBOARD_ROOT)/skill/Tools/add-service.ts \
		--name $(SERVICE_NAME) --set-status stopped --update 2>/dev/null || true

restart: dev  ## Alias for dev (stop + start)

clear-cache: dev  ## Restart server (forces new build-id, triggers live-reload)

status:  ## Show server status
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		PORT=$$(cat $(PORT_FILE) 2>/dev/null || echo "?"); \
		echo "$(SERVICE_NAME): RUNNING (PID $$(cat $(PID_FILE)), port $$PORT)"; \
		curl -sf http://localhost:$$PORT$(HEALTH_PATH) 2>/dev/null | head -1 || echo "  Health check: FAILED"; \
	else \
		echo "$(SERVICE_NAME): STOPPED"; \
	fi

logs:  ## Tail server logs
	@if [ -f $(LOG_FILE) ]; then tail -f $(LOG_FILE); \
	else echo "No log file found at $(LOG_FILE)"; fi

health:  ## Run health check
	@PORT=$$(cat $(PORT_FILE) 2>/dev/null || echo "9000"); \
	curl -sf http://localhost:$$PORT$(HEALTH_PATH) | python3 -m json.tool 2>/dev/null || echo "UNHEALTHY"

# --- Internal targets ---

_find_port:
	@mkdir -p $(STATE_DIR)
	@for port in $$(seq $(PORT_MIN) $(PORT_MAX)); do \
		if ! ss -tlnH "sport = $$port" 2>/dev/null | grep -q .; then \
			echo "$$port" > $(PORT_FILE); \
			echo "Allocated port $$port"; \
			break; \
		fi; \
	done
	@if [ ! -f $(PORT_FILE) ]; then \
		echo "ERROR: No free port in range $(PORT_MIN)-$(PORT_MAX)" >&2; exit 1; \
	fi

_start:
	@PORT=$$(cat $(PORT_FILE)); \
	echo "Starting $(SERVICE_NAME) on port $$PORT..."; \
	PORT=$$PORT USE_TLS=false nohup bun run --hot $(ENTRY_POINT) > $(LOG_FILE) 2>&1 & \
	echo $$! > $(PID_FILE); \
	sleep 2; \
	if ! kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "ERROR: Server failed to start. Check $(LOG_FILE)" >&2; \
		tail -5 $(LOG_FILE); exit 1; \
	fi; \
	echo "Started (PID $$(cat $(PID_FILE)))"

_tailscale:
	@PORT=$$(cat $(PORT_FILE)); \
	CURRENT=$$(sudo tailscale serve status 2>/dev/null | grep ":$(EXTERNAL_PORT)" -A1 | grep "proxy" | awk '{print $$NF}' | sed 's|http://localhost:||'); \
	if [ "$$CURRENT" != "$$PORT" ]; then \
		echo "Updating tailscale serve: $(EXTERNAL_PORT) -> localhost:$$PORT"; \
		sudo tailscale serve --bg --set-path=/ --https=$(EXTERNAL_PORT) http://localhost:$$PORT; \
	else \
		echo "Tailscale serve already maps $(EXTERNAL_PORT) -> localhost:$$PORT"; \
	fi

_health:
	@PORT=$$(cat $(PORT_FILE)); \
	for i in $$(seq 1 10); do \
		if curl -sf http://localhost:$$PORT$(HEALTH_PATH) > /dev/null 2>&1; then \
			echo "Health check passed"; exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "WARNING: Health check not responding after 10s" >&2

_register:
	@echo "Registering $(SERVICE_NAME) with service-dashboard..."
	@bun $(DASHBOARD_ROOT)/skill/Tools/add-service.ts \
		--name $(SERVICE_NAME) \
		--type native-daemon \
		--stage dev \
		--port $(EXTERNAL_PORT) \
		--native-port $$(cat $(PORT_FILE)) \
		--path $(CURDIR) \
		--set-status healthy \
		--update 2>/dev/null && echo "Registered" || echo "Warning: Registration failed (dashboard may not be available)"
