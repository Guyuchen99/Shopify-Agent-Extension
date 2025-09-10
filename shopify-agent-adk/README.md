### Remote Deployment

0. Install Library:

```bash
uv sync
```

1. Deploy the agent:

```bash
uv run util.py --create
```

2. Create a session:

```bash
uv run util.py --create_session --resource_id=your-resource-id --user_id=your-user-id
```

3. List sessions:

```bash
uv run util.py --list_sessions --resource_id=your-resource-id
```

4. Send a message:

```bash
uv run util.py --send --resource_id=your-resource-id --session_id=your-session-id --message="Hello, how are you doing today?"
```

5. Clean up (delete deployment):

```bash
uv run util.py --delete --resource_id=your-resource-id
```
