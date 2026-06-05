const { CometChat } = require('@cometchat/chat-sdk-javascript');

const APP_ID = "167945039205d7771";
const REGION = "in";
const AUTH_KEY = "037ab218740d0f83eb5271fada85141c40fae23b";

async function run() {
  const appSetting = new CometChat.AppSettingsBuilder().subscribePresenceForAllUsers().setRegion(REGION).build();
  await CometChat.init(APP_ID, appSetting);
  console.log("Initialized");
  
  const user = await CometChat.login("f22e6709abcb42a1b3efa5b504e5ec46", AUTH_KEY);
  console.log("Logged in as", user.getUid());

  try {
    const conv = await CometChat.getConversation("3869995a-1234", "user");
    console.log("Conversation fetched", conv);
  } catch (err) {
    console.error("Conversation fetch failed:", err);
  }
  
  process.exit(0);
}
run();
