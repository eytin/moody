# Moody

Moody is a simple CLI mindfulness app to track your daily moods and reflections.

## Features

- Log your mood with a reflection note and **optional tags** (comma-separated)  
- View your mood history with numbered entries, including tags  
- Filter history by mood, date range, and **multiple tags** (all tags must match)  
- Delete individual entries or clear all entries  
- Export your mood data (including tags) to CSV  
- Set a daily reminder to check in at a custom time that is remembered until changed  

## Usage

### 1. Logging Mood with Tags

```bash
moody check-in
```

During the prompt, you can enter tags as a **comma-separated list** (e.g., `work, urgent, stress`) to categorize your mood entry.

---

### 2. Viewing History with Filtering

```bash
moody history [options]
```

**Options for filtering:**

| Option        | Description                                |
|---------------|--------------------------------------------|
| `--mood <mood>`    | Filter by mood (exact match)                |
| `--tag <tag>`      | Filter by one or more tags (AND logic) (can specify multiple times) |
| `--from <YYYY-MM-DD>` | Show entries on or after this date          |
| `--to <YYYY-MM-DD>`   | Show entries on or before this date         |

**Example:**

```bash
moody history --tag work --tag stress --mood Sad --from 2024-01-01
```

This command shows entries tagged both `work` and `stress` with mood `Sad` from January 1, 2024 onward.

---

### 3. Managing Custom Views

- Save a view:

  ```bash
  moody view save <name> [filters...]
  ```

- Load a view:

  ```bash
  moody view load <name>
  ```

Example:

```bash
moody view save focused --mood Happy --tag work --from 2024-01-01
moody view load focused
```

---

### 4. Export to CSV

```bash
moody export
```

Exports all mood entries to `mood_log.csv`, including tags.

---

### 5. Reminder

```bash
moody reminder
```

Set or update a daily reminder time. You’ll get a desktop notification plus a CLI prompt at the set time daily.

---

### 6. Data Management

```bash
moody delete <num>   # Delete a specific entry by its number
moody clear          # Clear all mood entries
```

---

## Installation

```bash
npm install -g
npm link
```

---

## Data Storage

- Entries, configs, and views are saved locally in the `data/` folder.  
- Exported CSV appears in the project root as `mood_log.csv`.

---

Enjoy mindful coding! 🌱
