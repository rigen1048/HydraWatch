from pathlib import Path

# Absolute path inside the container (matches the volume mount)
path = path = Path(__file__).resolve().parents[1] / "content"
print(path)
