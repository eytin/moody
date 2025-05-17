#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer').default;
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const dataDir = path.join(__dirname, 'data');
const entriesFile = path.join(dataDir, 'entries.json');
const configFile = path.join(dataDir, 'config.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(entriesFile)) fs.writeFileSync(entriesFile, '[]');
if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '{}');

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

program
  .command('check-in')
  .description('Record your current mood')
  .action(async () => {
    try {
      const { mood, note } = await inquirer.prompt([
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
        }
      ]);

      const entries = loadEntries();
      entries.push({ date: new Date().toISOString(), mood, note });
      saveEntries(entries);

      console.log('\n✅ Mood logged. Thank you for checking in.\n');
    } catch {}
  });

program
  .command('history')
  .description('View your past mood entries')
  .action(() => {
    try {
      const entries = loadEntries();

      if (entries.length === 0) {
        console.log('\n📭 No mood entries found yet.\n');
        return;
      }

      console.log('\n📖 Your Mood History:\n');
      entries.forEach(({ date, mood, note }, index) => {
        const formattedDate = new Date(date).toLocaleDateString();
        console.log(`${index + 1}. 🗓️  ${formattedDate}: ${mood}`);
        if (note && note.trim()) {
          console.log(`    💬 ${note}`);
        }
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
    } catch {}
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

      const csvRows = ['Date,Mood,Reflection'];

      for (const { date, mood, note } of entries) {
        const formattedDate = new Date(date).toLocaleDateString();
        const safeNote = (note || '').replace(/"/g, '""');
        csvRows.push(`"${formattedDate}","${mood}","${safeNote}"`);
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
        // Ask user if they want to keep or change the saved time
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
        console.log(`\n⏰ Reminder: Time to check in your mood! (${time})\n`);

        try {
          const { mood, note } = await inquirer.prompt([
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
            }
          ]);

          const entries = loadEntries();
          entries.push({ date: new Date().toISOString(), mood, note });
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

program.parse();
