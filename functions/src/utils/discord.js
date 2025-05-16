const axios = require("axios");
const config = require("./config");

/**
 * Send a message to a Discord webhook
 * @param {string} webhookUrl - Discord webhook URL
 * @param {Object} embed - Discord embed object
 * @returns {Promise<Object>} - The response from the webhook
 */
async function sendDiscordMessage(webhookUrl, embed) {
  try {
    // Minimal logging in test mode
    if (config.isTestMode()) {
      console.log(`TEST MODE - Sending to webhook URL: ${webhookUrl}`);
    }
    
    // Always send the request and return the response
    const payload = { embeds: [embed] };
    const response = await axios.post(webhookUrl, payload);
    return response.data;
  } catch (error) {
    if (config.isTestMode()) {
      console.error(`Error sending Discord message to ${webhookUrl}:`, error.message);
      // In test mode, provide a mock response if the request fails
      return {
        success: true, 
        echo: payload,
        mocked: true,
        error: error.message
      };
    } else {
      console.error("Error sending Discord message:", error);
      throw error;
    }
  }
}

/**
 * Create a Discord embed for GitHub events
 * @param {Object} payload - GitHub webhook payload
 * @param {string} eventType - GitHub event type
 * @returns {Object} Discord embed
 */
function formatGitHubMessage(payload, eventType) {
  const embed = {
    title: "",
    description: "",
    url: "",
    color: 0x2EA44F, // GitHub green
    timestamp: new Date().toISOString(),
    footer: {
      text: "GitHub",
      icon_url: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png"
    },
    author: {
      name: payload.sender ? payload.sender.login : "Unknown",
      url: payload.sender ? payload.sender.html_url : "",
      icon_url: payload.sender ? payload.sender.avatar_url : ""
    },
    fields: []
  };

  // Format based on event type
  switch (eventType) {
    case "push":
      const branch = payload.ref.replace("refs/heads/", "");
      embed.title = `[${payload.repository.name}] Push to ${branch}`;
      embed.url = payload.compare;
      
      // Get the commits info
      const commits = payload.commits.slice(0, 5); // Limit to 5 commits
      if (commits.length > 0) {
        embed.description = `${payload.commits.length} commit(s) pushed`;
        
        // Add commit messages
        commits.forEach(commit => {
          embed.fields.push({
            name: commit.id.substring(0, 7),
            value: `[${commit.message.split("\n")[0]}](${commit.url}) - ${commit.author.name}`
          });
        });
        
        if (payload.commits.length > 5) {
          embed.fields.push({
            name: "...",
            value: `${payload.commits.length - 5} more commits not shown`
          });
        }
      }
      break;
      
    case "pull_request":
      const action = payload.action;
      embed.title = `[${payload.repository.name}] Pull Request ${action}`;
      embed.url = payload.pull_request.html_url;
      embed.description = `[#${payload.pull_request.number}: ${payload.pull_request.title}](${payload.pull_request.html_url})`;
      
      embed.fields.push(
        {
          name: "State",
          value: payload.pull_request.state,
          inline: true
        },
        {
          name: "Merged",
          value: payload.pull_request.merged ? "Yes" : "No",
          inline: true
        }
      );
      
      if (payload.pull_request.body) {
        // Truncate description if too long
        const description = payload.pull_request.body.length > 1000 
          ? payload.pull_request.body.substring(0, 997) + "..." 
          : payload.pull_request.body;
          
        embed.fields.push({
          name: "Description",
          value: description
        });
      }
      break;
      
    case "issues":
      embed.title = `[${payload.repository.name}] Issue ${payload.action}`;
      embed.url = payload.issue.html_url;
      embed.description = `[#${payload.issue.number}: ${payload.issue.title}](${payload.issue.html_url})`;
      embed.color = 0xE99455; // Orange for issues
      
      if (payload.issue.body) {
        // Truncate description if too long
        const description = payload.issue.body.length > 1000 
          ? payload.issue.body.substring(0, 997) + "..." 
          : payload.issue.body;
          
        embed.fields.push({
          name: "Description",
          value: description
        });
      }
      break;
      
    case "issue_comment":
      embed.title = `[${payload.repository.name}] Comment on issue #${payload.issue.number}`;
      embed.url = payload.comment.html_url;
      embed.description = `${payload.comment.user.login} commented on [#${payload.issue.number}: ${payload.issue.title}](${payload.issue.html_url})`;
      
      if (payload.comment.body) {
        // Truncate comment if too long
        const comment = payload.comment.body.length > 1000 
          ? payload.comment.body.substring(0, 997) + "..." 
          : payload.comment.body;
          
        embed.fields.push({
          name: "Comment",
          value: comment
        });
      }
      break;
      
    default:
      embed.title = `[${payload.repository.name}] ${eventType} event received`;
      embed.description = "Unsupported event type";
  }

  return embed;
}

/**
 * Create a Discord embed for Trello events
 * @param {Object} data - Trello event data
 * @returns {Object|null} Discord embed or null if notification should be filtered out
 */
function formatTrelloMessage(data) {
  if (!data.action || !data.action.type) {
    return {
      title: "Trello Activity",
      description: "Unrecognized Trello event",
      url: data.model?.url || "",
      color: 0x0079BF, // Trello blue
      timestamp: new Date().toISOString(),
      footer: {
        text: "Trello",
        icon_url: "https://d2k1ftgv7pobq7.cloudfront.net/meta/u/res/images/trello-header-logos/76ceb1faa939ede03abacb6efacdde16/trello-logo-blue.svg"
      },
      fields: []
    };
  }

  const action = data.action;
  const actionType = action.type;
  
  // Skip unwanted notification types
  const filteredTypes = [
    "createCheckItem", 
    "updateCheckItem", 
    "addAttachmentToCard", 
    "addChecklistToCard", 
    "updateCheckItemStateOnCard"
  ];
  
  if (filteredTypes.includes(actionType)) {
    return null;
  }

  const embed = {
    title: "",
    description: "",
    url: data.model?.url || "",
    color: 0x0079BF, // Trello blue
    timestamp: new Date().toISOString(),
    footer: {
      text: "Trello",
      icon_url: "https://d2k1ftgv7pobq7.cloudfront.net/meta/u/res/images/trello-header-logos/76ceb1faa939ede03abacb6efacdde16/trello-logo-blue.svg"
    },
    fields: []
  };

  // Format based on action type
  const memberName = action.memberCreator ? action.memberCreator.fullName : "Unknown";
  
  switch (actionType) {
    case "createCard":
      embed.title = "Card Created";
      embed.description = `${memberName} created card [${action.data.card.name}](${data.model.url})`;
      
      if (action.data.list) {
        embed.fields.push({
          name: "List",
          value: action.data.list.name,
          inline: true
        });
      }
      break;
      
    case "updateCard":
      if (action.data.listBefore && action.data.listAfter) {
        // Card moved
        embed.title = "Card Moved";
        embed.description = `${memberName} moved card [${action.data.card.name}](${data.model.url})`;
        
        embed.fields.push(
          {
            name: "From",
            value: action.data.listBefore.name,
            inline: true
          },
          {
            name: "To",
            value: action.data.listAfter.name,
            inline: true
          }
        );
      } else if (action.data.old && action.data.old.hasOwnProperty("due")) {
        // Due date changed
        embed.title = "Due Date Changed";
        embed.description = `${memberName} updated due date for card [${action.data.card.name}](${data.model.url})`;
        
        const newDue = action.data.card.due ? new Date(action.data.card.due).toLocaleString() : "None";
        const oldDue = action.data.old.due ? new Date(action.data.old.due).toLocaleString() : "None";
        
        embed.fields.push(
          {
            name: "From",
            value: oldDue,
            inline: true
          },
          {
            name: "To",
            value: newDue,
            inline: true
          }
        );
      } else {
        // Other card update
        embed.title = "Card Updated";
        embed.description = `${memberName} updated card [${action.data.card.name}](${data.model.url})`;
      }
      break;
      
    case "commentCard":
      embed.title = "Comment Added";
      embed.description = `${memberName} commented on card [${action.data.card.name}](${data.model.url})`;
      
      if (action.data.text) {
        // Truncate comment if too long
        const comment = action.data.text.length > 1000 
          ? action.data.text.substring(0, 997) + "..." 
          : action.data.text;
          
        embed.fields.push({
          name: "Comment",
          value: comment
        });
      }
      break;
      
    case "addMemberToCard":
      embed.title = "Member Added to Card";
      embed.description = `${memberName} added ${action.data.member.name} to card [${action.data.card.name}](${data.model.url})`;
      break;
      
    case "removeMemberFromCard":
      embed.title = "Member Removed from Card";
      embed.description = `${memberName} removed ${action.data.member.name} from card [${action.data.card.name}](${data.model.url})`;
      break;
      
    case "addLabelToCard":
      embed.title = "Label Added";
      embed.description = `${memberName} added label to card [${action.data.card.name}](${data.model.url})`;
      
      if (action.data.label) {
        embed.fields.push({
          name: "Label",
          value: action.data.label.name || action.data.label.color,
          inline: true
        });
      }
      break;
      
    default:
      embed.title = "Trello Activity";
      embed.description = `${memberName} performed action: ${actionType}`;
  }

  return embed;
}

module.exports = {
  sendDiscordMessage,
  formatGitHubMessage,
  formatTrelloMessage
};