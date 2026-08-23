#!/usr/bin/env node
/**
 * Enregistre la commande slash /article aupres de Discord. A lancer UNE
 * SEULE FOIS en local (pas sur Vercel) apres avoir cree le bot : Discord
 * garde la commande enregistree cote serveur, pas besoin de relancer ce
 * script a chaque deploiement.
 *
 * Usage :
 *   node scripts/register-discord-command.js <BOT_TOKEN> <APPLICATION_ID> <GUILD_ID>
 *
 * Ou renseigne DISCORD_BOT_TOKEN / DISCORD_APPLICATION_ID / DISCORD_GUILD_ID
 * dans l'environnement et lance sans arguments.
 *
 * - BOT_TOKEN et APPLICATION_ID : Discord Developer Portal > ton app >
 *   General Information (Application ID) et Bot (token).
 * - GUILD_ID : clic droit sur le nom de ton serveur Discord > Copier l'ID
 *   (active le mode developpeur : Reglages > Avance > Mode developpeur).
 *
 * Commande scopee au serveur (guild command) plutot que globale : elle
 * apparait immediatement, une commande globale peut mettre jusqu'a 1h a se
 * propager.
 */

const [botToken, applicationId, guildId] = [
  process.argv[2] || process.env.DISCORD_BOT_TOKEN,
  process.argv[3] || process.env.DISCORD_APPLICATION_ID,
  process.argv[4] || process.env.DISCORD_GUILD_ID,
];

if (!botToken || !applicationId || !guildId) {
  console.error(
    "Usage: node scripts/register-discord-command.js <BOT_TOKEN> <APPLICATION_ID> <GUILD_ID>\n" +
      "(ou variables d'env DISCORD_BOT_TOKEN / DISCORD_APPLICATION_ID / DISCORD_GUILD_ID)"
  );
  process.exit(1);
}

const command = {
  name: "article",
  description: "Génère un brouillon d'article via Gemini et l'envoie en review",
  // reserve la commande aux membres avec la permission "Gerer le serveur",
  // pour eviter que n'importe qui declenche des appels Gemini payants.
  default_member_permissions: String(1 << 5), // MANAGE_GUILD
  options: [
    {
      name: "topic",
      description: "Sujet de l'article (nom d'artiste, titre de son, angle...)",
      type: 3, // STRING
      required: true,
    },
    {
      name: "texte",
      description: "Notes/texte brut optionnel à transformer en article",
      type: 3, // STRING
      required: false,
    },
  ],
};

async function main() {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`Échec (${res.status}) :`, JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log("✅ Commande /article enregistrée avec succès.");
  console.log(JSON.stringify(body, null, 2));
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
