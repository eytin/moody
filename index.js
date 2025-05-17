#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer').default;
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'data', 'entries.json');

if (!fs.existsSync('data')) fs.mkdirSync('data');
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

function loadEntries() {
  try {
    return JSON.parse(fs.readFileSync(dataFile));
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  fs.writeFileSync(dataFile, JSON.stringify(entries, null, 2));
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

      // CSV header
      const csvRows = ['Date,Mood,Reflection'];

      // Add each entry, escaping quotes in note
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

program.parse();
