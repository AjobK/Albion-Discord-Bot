require('dotenv/config')

const Discord = require('discord.js')
const fetch = require('node-fetch')
const Canvas = require('canvas')
const puppeteer = require('puppeteer')
const fs = require('fs')

const { registerFont, createCanvas } = Canvas
const bot = new Discord.Client()
const prefix = '-'
const { BOT_TOKEN } = process.env
const ADMIN_ID = '166969527504994304'

registerFont('./fonts/Koch Fraktur.ttf', { family: 'Koch-Fraktur' })

bot.login(BOT_TOKEN)

bot.on('ready', () => {
	console.log(`[${bot.user.username}] bot is running`)
	activateCollectorsForRoleSelectors() // Init role selectors
	bot.user.setStatus('available')
	bot.user.setActivity('Use ' + prefix + 'help to use me!')
})

bot.on('message', msg => {
	// Check if messager is bot
	if (msg.author.bot) return

	// Check if is DM
	if (msg.guild === null) {
		msg.reply(msg.content.split('').map((v, i) => i%2?v.toLowerCase():v.toUpperCase()).join('') + '... :rolling_eyes:')
		return
	}

	// Only listen to commands
	if (!msg.content.startsWith(prefix)) return

	// Filter out first word for command
	let command = msg.content.split(' ')[0].toLowerCase()

	console.log(msg.member.displayName + ' used ' + command)

	command = command.substr(command.indexOf(prefix) + prefix.length)

	if (command === 'hello') msg.reply('Greetings guild member!')
	else if (command === 'myavatar') msg.reply('Cool avatar!\n' + msg.author.displayAvatarURL())
	else if (command === 'goldprice') sendGoldPrice(msg)
	else if (command === 'toppve') getTop(msg, 'https://albiononline.com/en/killboard/table/guilds-top-pve-fame?guildId=vpdglIj6RCK2cTD8hEBQxw&guildName=Tor+Rak', 'PVE')
	else if (command === 'toppvp') getTop(msg, 'https://albiononline.com/en/killboard/table/guilds-top-pvp-fame?guildId=vpdglIj6RCK2cTD8hEBQxw&guildName=Tor+Rak', 'PVP')
	else if (command === 'topgathering') getTop(msg, 'https://albiononline.com/en/killboard/table/guilds-top-gathering-fame?guildId=vpdglIj6RCK2cTD8hEBQxw&guildName=Tor+Rak', 'Gathering')
	else if (command === 'topcrafting') getTop(msg, 'https://albiononline.com/en/killboard/table/guilds-top-crafting-fame?guildId=vpdglIj6RCK2cTD8hEBQxw&guildName=Tor+Rak', 'Crafting')
	else if (command === 'help') msg.reply(getHelpMessage())
	else if (command === 'about') msg.reply(`I am here to serve the Tor Rak guild!\n\`[UP TIME]\t${millisecondsToReadable(bot.uptime)}\`\n\n*My code has been written by Elomin.*`)
	else if (command === 'mkevent') makeEvent(msg)
	else if (command === 'rmevent') removeEvent(msg)
	else if (command === 'showevent') showEvent(msg)
	else if (command === 'showevents') showEvents(msg)
	else if (command === 'signup') signupEvent(msg)
	else if (command === 'signoff') signoffEvent(msg)
	else if (command === 'testcanvas') sendImgWithThings(msg.channel, msg.member)
	else if (command === 'ask') getGooglesearch(msg)
	else if (command === 'askfb') askFeedback(msg)
	else if (command === 'addroleselector') addRoleSelector(msg)
	else msg.reply(`:thinking: That command does not exist.\n\nType \`${prefix}help\` to view all the commands.`)
})

bot.on('guildMemberAdd', member => {
	// Send the message to a designated channel on a server:
	const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome')
	// Do nothing if the channel wasn't found on this server
	if (!channel) return
	// Send the message, mentioning the member
	sendImgWithThings(channel, member)
	channel.send(`**<@${member.id}> Welcome to '${member.guild.name}'!**`)
})

bot.on('messageReactionRemove', (messageReaction, user) => {
	let rawdata = fs.readFileSync('saved_messages.json')
	let savedMessages = JSON.parse(rawdata)

	const { id, guild } = messageReaction.message

	if (savedMessages[guild.id] && savedMessages[guild.id]['role_selector'] && savedMessages[guild.id]['role_selector']['id'] == id) {
		let mem = guild.members.cache.find((m) => m.id === user.id)
		let PVERole = guild.roles.cache.find(role => role.name === 'PVE')
		let PVPRole = guild.roles.cache.find(role => role.name === 'PVE')
		let GatheringAndCraftingRole = guild.roles.cache.find(role => role.name === 'Gathering & Crafting')

		if (!mem || !PVERole || !PVPRole || GatheringAndCraftingRole) return

		if (reaction.emoji.name == '⚔️') mem.roles.remove(PVPRole)
		if (reaction.emoji.name == '🏹') mem.roles.remove(PVERole)
		if (reaction.emoji.name == '🪓') mem.roles.remove(GatheringAndCraftingRole)

		console.log(`Removed ${messageReaction.emoji.name} from ${user.tag}`)
	}
})

async function activateCollectorsForRoleSelectors() {
	let rawdata = fs.readFileSync('saved_messages.json')
	let savedMessages = JSON.parse(rawdata)

	console.log('ACTIVATING ROLE SELECTORS')

	for (g in savedMessages) {
		console.log('Guild ' + g)
		if (!savedMessages[g.toString()]['role_selector']) return // No role selector for guild
		
		console.log('Guild ' + g + ' has role selector')

		let msg = await returnMessageIfExists(savedMessages[g.toString()]['role_selector'], g)

		makeRoleCollector(msg)
	}
}

async function returnMessageIfExists(msgInfo, guildId) {
	let guild = bot.guilds.cache.get(guildId)
	if (!guild) return false	// Guild does not exist
	let channel = guild.channels.cache.get(msgInfo['channelId'])
	if (!channel) return false	// Channel does not exist
	let message = await channel.messages.fetch(msgInfo['id'])
	if (!message) return false	// Message does not exist

	return message
}

const getRoleSelectorMsg = async (msg) => await msg.channel.send(
	':triangular_flag_on_post: **What role are you focused on?**\n\n' +
	':crossed_swords:\t\t- PVP\n' +
	':bow_and_arrow:\t\t- PVE\n' +
	':axe:\t\t- Gathering & Crafting\n\n' + 
	'`React with the appropriate icon`'
)

function makeRoleCollector(message) {
	const filter = (reaction, user) => true

	let collector = message.createReactionCollector(filter)

	collector.on('collect', (reaction, user) => {
		let { guild } = reaction.message
		let mem = guild.members.cache.find((m) => m.id === user.id)

		if (!mem) return

		let roleName
		if (reaction.emoji.name == '⚔️') roleName = 'PVP'
		else if (reaction.emoji.name == '🏹') roleName = 'PVE'
		else if (reaction.emoji.name == '🪓') roleName = 'Gathering & Crafting'
		
		let role = guild.roles.cache.find(role => role.name === roleName)

		if (!role) return

		let currentRoles = mem.roles.cache.map(r => r)

		if (currentRoles.indexOf(role) == -1) mem.roles.add(role)

		console.log(`Collected ${reaction.emoji.name} from ${user.tag}`)
	})
}

async function addRoleSelector(msg) {
	let rawdata = fs.readFileSync('saved_messages.json')
	let savedMessages = JSON.parse(rawdata)

	let msgRep = await getRoleSelectorMsg(msg)
	await msgRep.react('⚔️')
	await msgRep.react('🏹')
	await msgRep.react('🪓')
	
	makeRoleCollector(msg)

	if (!savedMessages[msg.guild.id]) savedMessages[msg.guild.id] = {}

	savedMessages[msg.guild.id]['role_selector'] = {
		'id': msgRep.id.toString(),
		'channelId': msgRep.channel.id.toString()
	}

	fs.writeFileSync('saved_messages.json', JSON.stringify(savedMessages, null, '\t'))
	console.log(savedMessages)
}

function askFeedback(msg) {
	msg.channel.send('Do you like this message?')
	const filter = (reaction, user) => reaction.emoji.name === '👌' && user.id === 'someID'
	msg.awaitReactions(filter, { time: 5000 })
	.then(collected => console.log(`Collected ${collected.size} reactions`))
	.catch(console.error);
}

function makeEvent(msg) {
	// Name of event, Event code, Date and time (DD/MM/YYYY HH:MM), Description, (Optional) max amount of players
	let msgArguments = msg.content.substring(9).split(',')

	if (msgArguments.length != 4) {
		msg.reply(
	   		'\n:no_entry_sign: **Invalid input**\n\n' +
			'Example:\t `' + prefix + 'mkevent Faction Wars, fw1, 06/06/2020 15:00, Faction wars for T5+ players in yellow zones!`'
		)
		return
	}

	msgArguments = msgArguments.map((i) => i.trim())
	console.log(msgArguments)

	let rawdata = fs.readFileSync('events.json')
	let events = JSON.parse(rawdata)

	if (!events[msg.guild.id]) events[msg.guild.id] = {}

	if (events[msg.guild.id][msgArguments[1]]) {
		msg.reply(
			'\n:no_entry_sign: **Event with the code ' + msArguments[1] + ' already exists**\n\n'
		)
		return
	}

	if (!msgArguments[2].match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/)) {
		msg.reply(
			'\n:no_entry_sign: **Invalid date format. Use DD/MM/YYYY HH:MM**\n\nMake sure this time aligns with the in-game time.\n' +
			'Example:\t `06/06/2020 15:00`'
		)
		return
	}

	events[msg.guild.id][msgArguments[1]] = {
		'name': msgArguments[0],
		'date': msgArguments[2],
		'description': msgArguments[3],
		'organiser': msg.member.displayName,
		'organiserId': msg.member.id,
		'players': [msg.member.displayName]
	}

	msg.reply(
		'```diff\n' +
		'\n+ Organiser  \t ' + msg.member.displayName +
		'\n- Event name \t ' + msgArguments[0] +
		'\n- Event code \t ' + msgArguments[1] +
		'\n- Event date \t ' + msgArguments[2] +
		'\n- Event desc \t ' + msgArguments[3] +
		'```' +
		'\n**Type `-signup ' + msgArguments[1] + '` to join**'
	)

	fs.writeFileSync('events.json', JSON.stringify(events, null, '\t'))
	console.log(events)
}

function removeEvent(msg) {
	let rawdata = fs.readFileSync('events.json')
	let events = JSON.parse(rawdata)
	let eventCode = msg.content.substring(9).trim()

	if (!events[msg.guild.id]) events[msg.guild.id] = {}

	if (!events[msg.guild.id][eventCode]) {
		msg.reply(
			'\n:no_entry_sign: **Event with code \'' + eventCode + '\' does not exist**\n\nTo make an event use the `-mkevent` command'
		)
		return
	}

	if (events[msg.guild.id][eventCode]['organiserId'] != msg.member.id) {
		msg.reply(
			'\n:no_entry_sign: **Only the organiser for event with code \'' + eventCode + '\' can remove this event**\n\nTo make an event use the `-mkevent` command'
		)
		return
	}

	delete events[msg.guild.id][eventCode]

	msg.reply(
		'\n:white_check_mark: **Succesfully removed event with eventcode \'' + eventCode + '\'**!'
	)

	fs.writeFileSync('events.json', JSON.stringify(events, null, '\t'))
}

function showEvent(msg) {
	let rawdata = fs.readFileSync('events.json')
	let events = JSON.parse(rawdata)
	let eventCode = msg.content.substring(11).trim()

	if (!events[msg.guild.id]) events[msg.guild.id] = {}

	if (!events[msg.guild.id][eventCode]) {
		msg.reply(
			'\n:no_entry_sign: **Event with code \'' + eventCode + '\' does not exist**\n\nTo make an event use the `-mkevent` command'
		)
		return
	}

	let playerString = '\n\n**:wolf: Player list (' + events[msg.guild.id][eventCode]['players'].length + ')**```diff'

	for (let i = 0; i < events[msg.guild.id][eventCode]['players'].length; i++) {
		playerString += `\n+ ${events[msg.guild.id][eventCode]['players'][i]}`
	}

	msg.reply(
		'\n:white_check_mark: **Showing event with eventcode \'' + eventCode + '\'**' +
		
		'```diff\n' +
		'\n+ Organiser    \t ' + events[msg.guild.id][eventCode]['organiser'] +
		'\n- Event name   \t ' + events[msg.guild.id][eventCode]['name'] +
		'\n- Event code   \t ' + eventCode +
		'\n- Event date   \t ' + events[msg.guild.id][eventCode]['date'] +
		'\n- Event desc   \t ' + events[msg.guild.id][eventCode]['description'] +
		'\n- Player count \t ' + events[msg.guild.id][eventCode]['players'].length +
		'```' +
		playerString + '\`\`\`'
	)
}

function showEvents(msg) {
	msg.reply('Showing events is not possible yet')
}

function signupEvent(msg) {
	let rawdata = fs.readFileSync('events.json')
	let events = JSON.parse(rawdata)
	let eventCode = msg.content.substring(8).trim()

	if (!events[msg.guild.id]) events[msg.guild.id] = {}

	if (!events[msg.guild.id][eventCode]) {
		msg.reply(
			'\n:no_entry_sign: **Event with code \'' + eventCode + '\' does not exist**\n\nTo make an event use the `-mkevent` command'
		)
		return
	}

	if (events[msg.guild.id][eventCode]['players'].includes(msg.member.displayName)) {
		msg.reply(
			'\n:no_entry_sign: **Already signed up for event with eventcode \'' + eventCode + '\'**\n\nTo sign off use the `' + prefix + 'signoff ' + eventCode + '` command'
		)
		return
	}

	events[msg.guild.id][eventCode]['players'].push(msg.member.displayName)
	fs.writeFileSync('events.json', JSON.stringify(events, null, '\t'))

	msg.reply(
		'\n:white_check_mark: **Signed up for event with eventcode \'' + eventCode + '\'!**' +
		
		'```diff\n' +
		'\n+ Organiser    \t ' + events[msg.guild.id][eventCode]['organiser'] +
		'\n- Event name   \t ' + events[msg.guild.id][eventCode]['name'] +
		'\n- Event code   \t ' + eventCode +
		'\n- Event date   \t ' + events[msg.guild.id][eventCode]['date'] +
		'\n- Event desc   \t ' + events[msg.guild.id][eventCode]['description'] +
		'\n- Player count \t ' + events[msg.guild.id][eventCode]['players'].length +
		'```'
	)
}

function signoffEvent(msg) {
	let rawdata = fs.readFileSync('events.json')
	let events = JSON.parse(rawdata)
	let eventCode = msg.content.substring(8).trim()

	if (!events[msg.guild.id]) events[msg.guild.id] = {}

	if (!events[msg.guild.id][eventCode]) {
		msg.reply(
			'\n:no_entry_sign: **Event with code \'' + eventCode + '\' does not exist**\n\nTo make an event use the `-mkevent` command'
		)
		return
	}

	if (!events[msg.guild.id][eventCode]['players'].includes(msg.member.displayName)) {
		msg.reply(
			'\n:no_entry_sign: **You are not signed up for event with code \'' + eventCode + '\'**\n\nTo sign up use the `' + prefix + 'signup ' + eventCode + '` command'
		)
		return
	}

	let index = events[msg.guild.id][eventCode]['players'].indexOf(msg.member.displayName)
	if (index !== -1) events[msg.guild.id][eventCode]['players'].splice(index, 1)
	fs.writeFileSync('events.json', JSON.stringify(events, null, '\t'))

	msg.reply(
		'\n:white_check_mark: **Signed off for event with eventcode \'' + eventCode + '\'!**' +
		
		'```diff\n' +
		'\n+ Organiser    \t ' + events[msg.guild.id][eventCode]['organiser'] +
		'\n- Event name   \t ' + events[msg.guild.id][eventCode]['name'] +
		'\n- Event code   \t ' + eventCode +
		'\n- Event date   \t ' + events[msg.guild.id][eventCode]['date'] +
		'\n- Event desc   \t ' + events[msg.guild.id][eventCode]['description'] +
		'\n- Player count \t ' + events[msg.guild.id][eventCode]['players'].length +
		'```'
	)
}

function millisecondsToReadable(mill) {
	let totalSeconds = (mill / 1000)
	let days = Math.floor(totalSeconds / 86400)
	totalSeconds %= 86400
	let hours = Math.floor(totalSeconds / 3600)
	totalSeconds %= 3600
	let minutes = Math.floor(totalSeconds / 60)
	let seconds = totalSeconds % 60

	return `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds`
}

function getHelpMessage() {
	return `
:question: **Commands for \'Tor Rak\' bot**
\`\`\`diff
+---------------+-------------------------------------------+
| ${prefix}hello        | Pings the server                          |
+---------------+-------------------------------------------+
| ${prefix}goldprice    | Displays the current silverprice for gold |
+---------------+-------------------------------------------+
| ${prefix}toppvp       | Leaderboard in guild for PVP fame         |
+---------------+-------------------------------------------+
| ${prefix}toppve       | Leaderboard in guild for PVE fame         |
+---------------+-------------------------------------------+
| ${prefix}topgathering | Leaderboard in guild for Gathering fame   |
+---------------+-------------------------------------------+
| ${prefix}topcrafting  | Leaderboard in guild for Crafting fame    |
+---------------+-------------------------------------------+
| ${prefix}mkevent      | Create an event such as faction wars      |
+---------------+-------------------------------------------+
| ${prefix}rmevent      | Remove an event by event code             |
+---------------+-------------------------------------------+
| ${prefix}signup       | Signup for an event by event code         |
+---------------+-------------------------------------------+
| ${prefix}signoff      | Signoff for an event by event code        |
+---------------+-------------------------------------------+
| ${prefix}myavatar     | Displays users avatar                     |
+---------------+-------------------------------------------+
| ${prefix}about        | Shows information related to the bot      |
+---------------+-------------------------------------------+\`\`\`
`
}

function sendGoldPrice(msg) {
	fetch('https://www.albion-online-data.com/api/v2/stats/gold?count=1')
	.then(json => json.json())
	.then(response => {
		response = response[0]
		msg.reply(
			'\t*[' + response['timestamp'] + ']*' +
			'\n\n:yellow_circle: ** 1 gold **' +
			'\n:white_circle: ** ' + response['price'] + ' silver **'
		)
	} )
}
const returnFontSize = (canvas, text) => {
	const ctx = canvas.getContext('2d')

	// Declare a base size of the font
	let fontSize = 80

	do {
		// Assign the font to the context and decrement it so it can be measured again
		fontSize -= 10
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (ctx.measureText(text).width > canvas.width - 300)

	// Return the result to use in the actual canvas
	return fontSize
}

async function sendImgWithThings(channel, member) {
	const canvas = createCanvas(715, 265)
	const ctx = canvas.getContext('2d')

	const banner = await Canvas.loadImage('./img/banner.png')
	ctx.drawImage(banner, 0, 0)

	// Slightly smaller text placed above the member's display name
	ctx.font = 'bold 28px sans-serif'
	ctx.shadowColor = 'rgba(0,0,0,1)'
	ctx.shadowBlur = 10
	// ctx.fillStyle = '#000'
	// ctx.fillRect(canvas.width / 2.8 - 10, canvas.height / 3 - 20, 335, 38)
	ctx.fillStyle = 'rgba(255,255,255,1)'
	ctx.fillText('Welcome to the server', canvas.width / 2.8, canvas.height / 3 + 10)

	
	const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ format: 'jpg' }))
	ctx.drawImage(avatar, 60, 60, 125, 125)
	
	const ring = await Canvas.loadImage('./img/player_ring.png')
	ctx.drawImage(ring, 25, 20)

	// Add an exclamation point here and below
	var gradient = ctx.createLinearGradient(0, 150, 0, 195)
	gradient.addColorStop(0, '#E8600B')
	gradient.addColorStop(1, '#8C1600')
	ctx.font = `bold ${returnFontSize(canvas, `${member.displayName}`)}px Koch-Fraktur`
	ctx.fillStyle = gradient
	ctx.fillText(`${member.displayName}`, canvas.width / 2.8, canvas.height / 1.5)

	const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'welcome-image.png')

	channel.send('', attachment)
}

async function getGooglesearch(msg) {
	let question = msg.content.substring(5)
	msg.channel.send(`<@${msg.author.id}>\n:mag_right: **Loading data for '${lbText}'...**`).then(async (sentMessage) => {
		try {
			const browser = await puppeteer.launch({
				args: ['--no-sandbox']
			})

			const page = await browser.newPage()
			await page.goto(url)
			await page.waitForSelector('.reactable-data', { timeout: 3000 })

			const top = await page.evaluate(() => {
				return document.querySelector('.reactable-data').innerHTML
			})

			let lb = makeTopLeaderboard(top)
		
			sentMessage.edit(`<@${msg.author.id}>` + '\n:trophy: **Google\'s answer: \'' + lbText + '\'**```js\n' + lb + '```')
		
			await browser.close()
		} catch (error) {
			sentMessage.edit(`<@${msg.author.id}>` + '\n:no_entry_sign: **Unfortunately the Albion servers are slow. Try again later**')
			
			if (bot.users.cache.get(ADMIN_ID)) // Elomin
				bot.users.cache.get(ADMIN_ID).send(':sloth: **' + error + '**\n```' + error.stack + '```')
		}
	})
}

async function getTop(msg, url, lbText) {
	msg.channel.send(`<@${msg.author.id}>\n:mag_right: **Loading data for '${lbText}'...**`).then(async (sentMessage) => {
		try {
			const browser = await puppeteer.launch({
				args: ['--no-sandbox']
			})

			const page = await browser.newPage()
			await page.goto(url)
			await page.waitForSelector('.reactable-data', { timeout: 3000 })

			const top = await page.evaluate(() => {
				return document.querySelector('.reactable-data').innerHTML
			})

			let lb = makeTopLeaderboard(top)
		
			sentMessage.edit(`<@${msg.author.id}>` + '\n:trophy: **This weeks leaderboard for \'' + lbText + '\'**```js\n' + lb + '```')
		
			await browser.close()
		} catch (error) {
			sentMessage.edit(`<@${msg.author.id}>` + '\n:no_entry_sign: **Unfortunately the Albion servers are slow. Try again later**')
			
			if (bot.users.cache.get(ADMIN_ID)) // Elomin
				bot.users.cache.get(ADMIN_ID).send(':sloth: **' + error + '**\n```' + error.stack + '```')
		}
	})
}

function makeTopLeaderboard(rawHTML) {
	let leaderboard = ''

	// Hooks
	let nameKeyword = '$Player.0.0.0">'
	let fameKeyword = '.$Fame.0">'
	for (let i = 1; i <= 10; i++) {
		if (rawHTML.indexOf(nameKeyword) == -1) return leaderboard
		let name = rawHTML.substring(
			rawHTML.indexOf(nameKeyword) + nameKeyword.length,
			rawHTML.indexOf('</strong></a></span></td>')
		)
		rawHTML = rawHTML.substring(rawHTML.indexOf('</strong></a></span></td>'))
		let fame = rawHTML.substring(
			rawHTML.indexOf(fameKeyword) + fameKeyword.length,
			rawHTML.indexOf('</span></td></tr>')
		)
		rawHTML = rawHTML.substring(rawHTML.indexOf('</span></td></tr>'))
		leaderboard += `\n${i >= 10 ? i + '.' : i + '. '}\t${name} // ${fame.toUpperCase()} FAME`
	}
	return leaderboard
}
