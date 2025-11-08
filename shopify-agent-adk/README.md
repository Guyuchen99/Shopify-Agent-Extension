### Remote Deployment

0. Install Library:

```bash
uv sync
```

1. Deploy the shopify agent:

```bash
uv run util.py --create
```

2. Deploy the advisor agent:

```bash
uv run util.py --create2
```

3. Delete a resource:

```bash
 uv run util.py --delete --resource_id=5353104301222789120
```

4. Create a session:

```bash
uv run util.py --create_session --resource_id=your-resource-id --user_id=your-user-id
```

5. List sessions:

```bash
uv run util.py --list_sessions --resource_id=your-resource-id
```

6. Send a message:

```bash
uv run util.py --send --resource_id=your-resource-id --session_id=your-session-id --message="Hello, how are you doing today?"
```
