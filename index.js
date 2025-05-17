#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer').default;
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const notifier = require('node-notifier');

const dataDir = path.join(__dirname, 'data');
const entriesFile = path.join(dataDir, 'entries.json');
const configFile = path.join(dataDir, 'config.json');
const viewsFile = path.join(dataDir, 'views.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(entriesFile)) fs.writeFileSync(entriesFile, '[]');
if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '{}');
if (!fs.existsSync(viewsFile)) fs.writeFileSync(viewsFile, '{}');

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

function loadEntries() {
  try {
    return JSON.parse(fs.readFileSync(entriesFile));
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  fs.writeFileSync(entriesFile, JSON.stringify(entries, null, 2));
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

function loadViews() {
  try {
    return JSON.parse(fs.readFileSync(viewsFile));
  } catch {
    return {};
  }
}

function saveViews(views) {
  fs.writeFileSync(viewsFile, JSON.stringify(views, null, 2));
}

program
  .command('check-in')
  .description('Record your current mood')
  .action(async () => {
    try {
      const { mood, note, tagsInput } = await inquirer.prompt([
        {
          type: 'list',
          name: 'mood',
          message: 'How are you feeling today?',
          choices: ['😃 Happy', '😐 Meh', '😞 Sad', '😠 Angry', '😰 Anxious', '✨ Grateful', 'Other'],
        },
        {
          type: 'input',
          name: 'note',
          message: "Anything you'd like to reflect on?",
        },
        {
          type: 'input',
          name: 'tagsInput',
          message: 'Add tags to categorize your mood (comma separated, optional):',
        }
      ]);

      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const entries = loadEntries();
      entries.push({ date: new Date().toISOString(), mood, note, tags });
      saveEntries(entries);

      console.log('\n✅ Mood logged. Thank you for checking in.\n');
    } catch {}
  });

program
  .command('history')
  .description('View your past mood entries')
  .option('--mood <mood>', 'Filter by mood')
  .option('--tag <tag...>', 'Filter by one or more tags (AND logic)')
  .option('--from <date>', 'Filter from date (YYYY-MM-DD)')
  .option('--to <date>', 'Filter to date (YYYY-MM-DD)')
  .action((options) => {
    try {
      const entries = loadEntries();

      if (entries.length === 0) {
        console.log('\n📭 No mood entries found yet.\n');
        return;
      }

      const { mood, tag, from, to } = options;
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      const filtered = entries.filter(entry => {
        const entryDate = new Date(entry.date);

        if (mood && entry.mood.toLowerCase() !== mood.toLowerCase()) return false;
        if (tag && (!entry.tags || !tag.every(t => entry.tags.map(et => et.toLowerCase()).includes(t.toLowerCase())))) return false;
        if (fromDate && entryDate < fromDate) return false;
        if (toDate && entryDate > toDate) return false;

        return true;
      });

      if (filtered.length === 0) {
        console.log('\n🔍 No entries match the given filters.\n');
        return;
      }

      console.log('\n📖 Filtered Mood History:\n');
      filtered.forEach(({ date, mood, note, tags }, index) => {
        const formattedDate = new Date(date).toLocaleDateString();
        console.log(`${index + 1}. 🗓️  ${formattedDate}: ${mood}`);
        if (note && note.trim()) console.log(`    💬 ${note}`);
        if (tags && tags.length) console.log(`    🏷️ Tags: ${tags.join(', ')}`);
      });
      console.log();
    } catch {}
  });

program
  .command('delete <number>')
  .description('Delete a specific mood entry by its number')
  .action((number) => {
    try {
      const entries = loadEntries();
      const index = parseInt(number, 10) - 1;

      if (isNaN(index) || index < 0 || index >= entries.length) {
        console.log('\n❌ Invalid entry number.\n');
        return;
      }

      const [removed] = entries.splice(index, 1);
      saveEntries(entries);

      console.log(`\n🗑️ Deleted entry #${number}: ${removed.mood} on ${new Date(removed.date).toLocaleDateString()}\n`);
    } catch {
      console.log('\n❌ Failed to delete entry.\n');
    }
  });

program
  .command('clear')
  .description('Clear all mood entries')
  .action(() => {
    try {
      saveEntries([]);
      console.log('\n🗑️ All mood entries cleared.\n');
    } catch {}
  });

program
  .command('export')
  .description('Export all mood entries to mood_log.csv')
  .action(() => {
    try {
      const entries = loadEntries();

      if (entries.length === 0) {
        console.log('\n📭 No mood entries to export.\n');
        return;
      }

      const csvRows = ['Date,Mood,Reflection,Tags'];

      for (const { date, mood, note, tags } of entries) {
        const formattedDate = new Date(date).toLocaleDateString();
        const safeNote = (note || '').replace(/"/g, '""');
        const safeTags = (tags || []).join(', ').replace(/"/g, '""');
        csvRows.push(`"${formattedDate}","${mood}","${safeNote}","${safeTags}"`);
      }

      const csvContent = csvRows.join('\n');
      const csvPath = path.join(__dirname, 'mood_log.csv');

      fs.writeFileSync(csvPath, csvContent);

      console.log(`\n✅ Exported ${entries.length} entries to mood_log.csv\n`);
    } catch {}
  });

program
  .command('reminder')
  .description('Start daily mood check-in reminder at your chosen time')
  .action(async () => {
    try {
      const config = loadConfig();
      let time;

      if (config.reminderTime) {
        const { keep } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'keep',
            message: `Current reminder time is set to ${config.reminderTime}. Do you want to keep it?`,
            default: true
          }
        ]);
        time = keep ? config.reminderTime : null;
      }

      if (!time) {
        const { newTime } = await inquirer.prompt([
          {
            type: 'input',
            name: 'newTime',
            message: 'What time would you like to be reminded every day? (24h format, e.g., 20:00)',
            validate: input => {
              if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input)) {
                return 'Please enter a valid time in 24-hour format, e.g., 08:30 or 20:00';
              }
              return true;
            }
          }
        ]);
        time = newTime;
        config.reminderTime = time;
        saveConfig(config);
      }

      const [hour, minute] = time.split(':').map(Number);

      console.log(`🕗 Daily reminder set for ${time}. You will be prompted every day at this time.`);

      cron.schedule(`${minute} ${hour} * * *`, async () => {
        notifier.notify({
          title: 'Moody Reminder',
          message: 'Time to check in your mood!',
          sound: true,
          wait: false
        });

        console.log(`\n⏰ Reminder: Time to check in your mood! (${time})\n`);

        try {
          const { mood, note, tagsInput } = await inquirer.prompt([
            {
              type: 'list',
              name: 'mood',
              message: 'How are you feeling today?',
              choices: ['😃 Happy', '😐 Meh', '😞 Sad', '😠 Angry', '😰 Anxious', '✨ Grateful', 'Other'],
            },
            {
              type: 'input',
              name: 'note',
              message: "Anything you'd like to reflect on?",
            },
            {
              type: 'input',
              name: 'tagsInput',
              message: 'Add tags to categorize your mood (comma separated, optional):',
            }
          ]);

          const tags = tagsInput
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

          const entries = loadEntries();
          entries.push({ date: new Date().toISOString(), mood, note, tags });
          saveEntries(entries);

          console.log('\n✅ Mood logged. Thank you for checking in.\n');
        } catch {}
      }, {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      // Keep process alive
      (async function keepAlive() {
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60));
        }
      })();

    } catch {}
  });

program
  .command('view save <name>')
  .description('Save a custom view')
  .option('--mood <mood>')
  .option('--tag <tag...>')
  .option('--from <date>')
  .option('--to <date>')
  .action((name, options) => {
    try {
      const views = loadViews();
      views[name] = options;
      saveViews(views);
      console.log(`✅ Saved view '${name}'`);
    } catch {
      console.log('❌ Failed to save view.');
    }
  });

program
  .command('view load <name>')
  .description('Load and apply a saved view')
  .action((name) => {
    try {
      const views = loadViews();
      const view = views[name];

      if (!view) {
        console.log(`❌ View '${name}' not found.`);
        return;
      }

      program.commands.find(c => c.name() === 'history')._actionHandler(view);
    } catch {
      console.log('❌ Failed to load view.');
    }
  });

program.parse();
