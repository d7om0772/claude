import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// الخطوط تُحمَّل محلياً من public/ — لا حاجة لأي طلب شبكة أثناء الرندر
Config.setChromiumOpenGlRenderer("angle");
