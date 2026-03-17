import asyncio
import json
import logging

logger = logging.getLogger(__name__)

class EventHub:
    def __init__(self):
        self.subscribers = []

    async def subscribe(self):
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            self.subscribers.remove(queue)

    def publish(self, event_type: str, data: dict):
        # Clean up data to ensure it's JSON serializable
        try:
            msg = json.dumps({"type": event_type, "data": data})
            for queue in self.subscribers:
                queue.put_nowait(msg)
        except Exception as e:
            logger.error(f"Failed to publish event: {e}")

# Global event hub instance
event_hub = EventHub()
