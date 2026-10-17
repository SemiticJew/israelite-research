(() => {
 const verses=[
 ['Proverbs 25:2','It is the glory of God to conceal a thing: but the honour of kings is to search out a matter.'],
 ['Ecclesiastes 1:9','The thing that hath been, it is that which shall be; and that which is done is that which shall be done: and there is no new thing under the sun.'],
 ['Amos 5:24','But let judgment run down as waters, and righteousness as a mighty stream.'],
 ['Psalm 119:105','Thy word is a lamp unto my feet, and a light unto my path.'],
 ['Proverbs 18:13','He that answereth a matter before he heareth it, it is folly and shame unto him.'],
 ['Isaiah 1:17','Learn to do well; seek judgment, relieve the oppressed, judge the fatherless, plead for the widow.'],
 ['James 1:22','But be ye doers of the word, and not hearers only, deceiving your own selves.']];
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const parts=day.split('-').map(Number);const index=Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/86400000)%verses.length;
 document.getElementById('daily-verse').textContent=verses[index][1];document.getElementById('daily-reference').textContent=verses[index][0];
})();
