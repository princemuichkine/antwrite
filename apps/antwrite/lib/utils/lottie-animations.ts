// Static imports for all Lottie animations from src/assets/lottie/
import accessibilityAnimation from "@/app/assets/lottie/accessibility.json";
import accountAnimation from "@/app/assets/lottie/account.json";
import analyticsAnimation from "@/app/assets/lottie/analytics.json";
import apiAnimation from "@/app/assets/lottie/api.json";
import arrowDownAnimation from "@/app/assets/lottie/arrow-down.json";
import arrowUpAnimation from "@/app/assets/lottie/arrow-up.json";
import autorenewAnimation from "@/app/assets/lottie/autorenew.json";
import blogAnimation from "@/app/assets/lottie/blog.json";
import boltAnimation from "@/app/assets/lottie/bolt.json";
import calculateAnimation from "@/app/assets/lottie/calculate.json";
import calendarAnimation from "@/app/assets/lottie/calendar.json";
import cardAnimation from "@/app/assets/lottie/card.json";
import cashAnimation from "@/app/assets/lottie/cash.json";
import chatAnimation from "@/app/assets/lottie/chat.json";
import checkAnimation from "@/app/assets/lottie/check.json";
import codeAnimation from "@/app/assets/lottie/code.json";
import coinAnimation from "@/app/assets/lottie/coin.json";
import contactsAnimation from "@/app/assets/lottie/contacts.json";
import creditCard2Animation from "@/app/assets/lottie/credit-card-2.json";
import creditCardAnimation from "@/app/assets/lottie/credit-card.json";
import cubeAnimation from "@/app/assets/lottie/cube.json";
import downloadAnimation from "@/app/assets/lottie/download.json";
import extensionAnimation from "@/app/assets/lottie/extension.json";
import flagAnimation from "@/app/assets/lottie/flag.json";
import group2Animation from "@/app/assets/lottie/group-2.json";
  import groupAnimation from "@/app/assets/lottie/group.json";
import helpAnimation from "@/app/assets/lottie/help.json";
import homeAnimation from "@/app/assets/lottie/home.json";
import hourglassAnimation from "@/app/assets/lottie/hourglass.json";
import infoAnimation from "@/app/assets/lottie/info.json";
import integrationAnimation from "@/app/assets/lottie/integration.json";
import linkAnimation from "@/app/assets/lottie/link.json";
import mailAnimation from "@/app/assets/lottie/mail.json";
import moletteAnimation from "@/app/assets/lottie/molette.json";
import notificationAnimation from "@/app/assets/lottie/notification.json";
import phoneAnimation from "@/app/assets/lottie/phone.json";
import podcastAnimation from "@/app/assets/lottie/podcast.json";
import pointAnimation from "@/app/assets/lottie/point.json";
import refreshAnimation from "@/app/assets/lottie/refresh.json";
import searchAnimation from "@/app/assets/lottie/search.json";
import settingsAnimation from "@/app/assets/lottie/settings.json";
import shoppingAnimation from "@/app/assets/lottie/shopping.json";
import sidepanelAnimation from "@/app/assets/lottie/sidepanel.json";
import sliderAnimation from "@/app/assets/lottie/slider.json";
import speedAnimation from "@/app/assets/lottie/speed.json";
import starAnimation from "@/app/assets/lottie/star.json";
import storeAnimation from "@/app/assets/lottie/store.json";
import supportAnimation from "@/app/assets/lottie/support.json";
import swapAnimation from "@/app/assets/lottie/swap.json";
import tagAnimation from "@/app/assets/lottie/tag.json";
import trendingAnimation from "@/app/assets/lottie/trending.json";
import viewAnimation from "@/app/assets/lottie/view.json";
import walletAnimation from "@/app/assets/lottie/wallet.json";
import workAnimation from "@/app/assets/lottie/work.json";
import profileAnimation from "@/app/assets/lottie/profile.json";
import loginAnimation from "@/app/assets/lottie/login.json";
import logoutAnimation from "@/app/assets/lottie/logout.json";
import mailopenAnimation from "@/app/assets/lottie/mailopen.json";
import fileplusAnimation from "@/app/assets/lottie/fileplus.json";
import forumAnimation from "@/app/assets/lottie/forum.json";
import sunAnimation from "@/app/assets/lottie/sun.json";
import rainAnimation from "@/app/assets/lottie/rain.json";
import checkmarkAnimation from "@/app/assets/lottie/checkmark.json";
import gridAnimation from "@/app/assets/lottie/grid.json";
import nineGridAnimation from "@/app/assets/lottie/ninegrid.json";
import luggageAnimation from "@/app/assets/lottie/luggage.json";
import agendaAnimation from "@/app/assets/lottie/agenda.json";
import bulbAnimation from "@/app/assets/lottie/bulb.json";
import carouselAnimation from "@/app/assets/lottie/carousel.json";
import celebrationAnimation from "@/app/assets/lottie/celebration.json";
import copyrightAnimation from "@/app/assets/lottie/copyright.json";
import cutAnimation from "@/app/assets/lottie/cut.json";
import dailpadAnimation from "@/app/assets/lottie/dailpad.json";
import discountAnimation from "@/app/assets/lottie/discount.json";
import email2Animation from "@/app/assets/lottie/email2.json";
import globeAnimation from "@/app/assets/lottie/globe.json";
import highpriorityAnimation from "@/app/assets/lottie/highpriority.json";
import httpAnimation from "@/app/assets/lottie/http.json";
import landAnimation from "@/app/assets/lottie/land.json";
import languageAnimation from "@/app/assets/lottie/language.json";
import lowpriorityAnimation from "@/app/assets/lottie/lowpriority.json";
import questionAnimation from "@/app/assets/lottie/question.json";
import scienceAnimation from "@/app/assets/lottie/science.json";
import sensorAnimation from "@/app/assets/lottie/sensor.json";
import takeoffAnimation from "@/app/assets/lottie/takeoff.json";
import trashAnimation from "@/app/assets/lottie/trash.json";
import upgradeAnimation from "@/app/assets/lottie/upgrade.json";
import view2Animation from "@/app/assets/lottie/view2.json";
import view3Animation from "@/app/assets/lottie/view3.json";
import visibilityAnimation from "@/app/assets/lottie/visibility.json";
import editAnimation from "@/app/assets/lottie/edit.json";
import ratioAnimation from "@/app/assets/lottie/ratio.json";
import crossAnimation from "@/app/assets/lottie/cross.json";
import filterAnimation from "@/app/assets/lottie/filter.json";
import playAnimation from "@/app/assets/lottie/play.json";
import pauseAnimation from "@/app/assets/lottie/pause.json";

// Lottie animation data type
export interface LottieAnimationData {
  v: string; // version
  fr: number; // frame rate
  ip: number; // in point
  op: number; // out point
  w: number; // width
  h: number; // height
  nm: string; // name
  ddd: number; // 3d
  assets: unknown[];
  layers: unknown[];
  markers?: unknown[];
}

// Export animations directly by name
export const animations = {
  accessibility: accessibilityAnimation,
  account: accountAnimation,
  analytics: analyticsAnimation,
  api: apiAnimation,
  arrowDown: arrowDownAnimation,
  arrowUp: arrowUpAnimation,
  autorenew: autorenewAnimation,
  blog: blogAnimation,
  bolt: boltAnimation,
  calculate: calculateAnimation,
  calendar: calendarAnimation,
  card: cardAnimation,
  cash: cashAnimation,
  chat: chatAnimation,
  check: checkAnimation,
  code: codeAnimation,
  coin: coinAnimation,
  contacts: contactsAnimation,
  creditCard2: creditCard2Animation,
  creditCard: creditCardAnimation,
  cube: cubeAnimation,
  download: downloadAnimation,
  extension: extensionAnimation,
  flag: flagAnimation,
  group2: group2Animation,
  group: groupAnimation,
  help: helpAnimation,
  home: homeAnimation,
  hourglass: hourglassAnimation,
  info: infoAnimation,
  integration: integrationAnimation,
  link: linkAnimation,
  mail: mailAnimation,
  molette: moletteAnimation,
  notification: notificationAnimation,
  phone: phoneAnimation,
  podcast: podcastAnimation,
  point: pointAnimation,
  refresh: refreshAnimation,
  search: searchAnimation,
  settings: settingsAnimation,
  shopping: shoppingAnimation,
  sidepanel: sidepanelAnimation,
  slider: sliderAnimation,
  speed: speedAnimation,
  star: starAnimation,
  store: storeAnimation,
  support: supportAnimation,
  swap: swapAnimation,
  tag: tagAnimation,
  trending: trendingAnimation,
  view: viewAnimation,
  wallet: walletAnimation,
  work: workAnimation,
  profile: profileAnimation,
  login: loginAnimation,
  mailopen: mailopenAnimation,
  fileplus: fileplusAnimation,
  logout: logoutAnimation,
  forum: forumAnimation,
  sun: sunAnimation,
  rain: rainAnimation,
  checkmark: checkmarkAnimation,
  grid: gridAnimation,
  nineGrid: nineGridAnimation,
  luggage: luggageAnimation,
  agenda: agendaAnimation,
  bulb: bulbAnimation,
  carousel: carouselAnimation,
  celebration: celebrationAnimation,
  copyright: copyrightAnimation,
  cut: cutAnimation,
  dailpad: dailpadAnimation,
  discount: discountAnimation,
  email2: email2Animation,
  globe: globeAnimation,
  highpriority: highpriorityAnimation,
  http: httpAnimation,
  land: landAnimation,
  language: languageAnimation,
  lowpriority: lowpriorityAnimation,
  question: questionAnimation,
  science: scienceAnimation,
  sensor: sensorAnimation,
  takeoff: takeoffAnimation,
  trash: trashAnimation,
  upgrade: upgradeAnimation,
  view2: view2Animation,
  view3: view3Animation,
  visibility: visibilityAnimation,
  edit: editAnimation,
  ratio: ratioAnimation,
  cross: crossAnimation,
  filter: filterAnimation,
  play: playAnimation,
  pause: pauseAnimation,
};

// Also export individual animations for direct import
export {
  accessibilityAnimation,
  accountAnimation,
  analyticsAnimation,
  apiAnimation,
  arrowDownAnimation,
  arrowUpAnimation,
  autorenewAnimation,
  blogAnimation,
  boltAnimation,
  calculateAnimation,
  calendarAnimation,
  cardAnimation,
  cashAnimation,
  chatAnimation,
  checkAnimation,
  codeAnimation,
  coinAnimation,
  contactsAnimation,
  creditCard2Animation,
  creditCardAnimation,
  cubeAnimation,
  downloadAnimation,
  extensionAnimation,
  flagAnimation,
  group2Animation,
  groupAnimation,
  helpAnimation,
  homeAnimation,
  hourglassAnimation,
  infoAnimation,
  integrationAnimation,
  linkAnimation,
  mailAnimation,
  moletteAnimation,
  notificationAnimation,
  phoneAnimation,
  podcastAnimation,
  pointAnimation,
  refreshAnimation,
  searchAnimation,
  settingsAnimation,
  shoppingAnimation,
  sidepanelAnimation,
  sliderAnimation,
  speedAnimation,
  starAnimation,
  storeAnimation,
  supportAnimation,
  swapAnimation,
  tagAnimation,
  trendingAnimation,
  viewAnimation,
  walletAnimation,
  workAnimation,
  profileAnimation,
  loginAnimation,
  mailopenAnimation,
  fileplusAnimation,
  logoutAnimation,
  forumAnimation,
  sunAnimation,
  rainAnimation,
  checkmarkAnimation,
  gridAnimation,
  nineGridAnimation,
  luggageAnimation,
  agendaAnimation,
  bulbAnimation,
  carouselAnimation,
  celebrationAnimation,
  copyrightAnimation,
  cutAnimation,
  dailpadAnimation,
  discountAnimation,
  email2Animation,
  globeAnimation,
  highpriorityAnimation,
  httpAnimation,
  landAnimation,
  languageAnimation,
  lowpriorityAnimation,
  questionAnimation,
  scienceAnimation,
  sensorAnimation,
  takeoffAnimation,
  trashAnimation,
  upgradeAnimation,
  view2Animation,
  view3Animation,
  visibilityAnimation,
  editAnimation,
  ratioAnimation,
  crossAnimation,
  filterAnimation,
  playAnimation,
  pauseAnimation,
};
