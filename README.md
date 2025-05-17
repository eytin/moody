# Moody

Moody is a simple CLI mindfulness app to track your daily moods and reflections.

## Features

- Log your mood with a reflection note and optional tags  
- View your mood history with numbered entries, including tags  
- Delete individual entries or clear all entries  
- Export your mood data (including tags) to CSV  
- Set a **daily reminder** to check in at a custom time that is remembered until changed  

## Usage

```bash
moody check-in       # Log today's mood with optional tags
moody history        # View past entries with tags
moody delete <num>   # Delete entry by number
moody clear          # Clear all entries
moody export         # Export entries to mood_log.csv (includes tags)
moody reminder       # Start daily reminder, set or update reminder time with tags prompt
