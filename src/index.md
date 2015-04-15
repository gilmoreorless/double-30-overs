“Double the 30-over score” – a cricket analysis
=============================

In one-day cricket there is an old maxim about trying to predict a team’s score, mostly referred to by commentators. It states that, on average, a team’s score at the end of its allotted 50 overs will be roughly double its score from the 30-over mark. Or, put more commonly, “Take the 30-over score and double it.”

To those unfamiliar with cricket this may seem odd, as basic arithmetic tells us that half of 50 overs is 25 overs, not 30. Where this maxim comes from, however, is the change in attitude of a batting team towards the end of its innings. Many factors contribute to this: various rule changes around fielding restrictions; batsmen who have had enough time batting to feel in good form; bowlers and fielders getting more tired; and so on. This means that batting teams generally score far more runs in the last 25 overs than in the first 25.

The recent ICC Cricket World Cup 2015 saw a high frequency of large scores, with a flurry of runs coming in the last 10-15 overs. We became accustomed to seeing teams scoring 150 runs in the last 10 overs, having only scored 200-odd runs in the previous 40 overs. This new pattern of scoring has been attributed to several factors that have changed in recent years (e.g. bigger bats, two new balls at the start of an innings, more restrictive fielding regulations). Each change would have some impact on its own, but when all changes are combined together there is a significant difference in the way teams approach a one-day innings.

During the 2015 World Cup, many commentators were heard to say that the old 30-over marker for half a team’s score was now redundant, and that many teams are reaching half their score at around 35 overs. This sounded like a “gut-feel” call to me, so I set out to find data that would sort it out.

My primary aims were to find out:

1. Was the 30-over score ever a reliable guideline or just anecdotal data?
2. Has the overall pattern of scoring changed in recent years in a statistically significant way?

Disclaimer: I am not a statistician, and quite possibly there’s a prominent statistical technique that I’ve missed. If so, let me know on [Twitter](https://twitter.com/iamnotyourbroom) or [GitHub](https://github.com/gilmoreorless/double-30-overs/issues).



The data
-----------------------------

In order to properly study scoring patterns, I needed ball-by-ball data for as many ODI (One-Day International) matches as possible. At the time of writing (just after the 2015 World Cup finished), since the first ODI in 1971 there have been **3646** ODIs where at least one ball was bowled (so this number excludes matches that were abandoned before play started, generally due to rain).

Ball-by-ball data was not collected in the early years of one-day cricket. The first match I could find on [Cricinfo](http://www.espncricinfo.com/) with ball-by-ball data for was in 1999, leaving **1899** matches with data that I could analyse.

However, there was only ball-by-ball data for a handful of matches in 1999 and none at all in 2000. It wasn’t until mid-2001 that ball-by-ball data was available for each match. Including a small number of matches from 1999 and then jumping forward 2 years wouldn’t provide accurate data trends, so I had to exclude all matches before June 7th, 2001. This reduced the count to **1858** matches.

The next task was to filter down individual innings to only those which lasted a full 50 overs.[asidemark] [aside]Early ODI matches were 60 overs per innings, but these were all well before the 2001 data cut-off.[/aside] The “double 30 overs” rule only works for teams that complete a 50 over innings. Any team getting having its innings cut short (e.g. by losing all its wickets, or rain reducing the overs available) loses the ability to pace its innings properly and would skew the statistics.

1858 matches with 2 innings per match gives 3716 innings in total (not all of which will have been played, due to rain). Restricting to only those lasting a full 50 overs reduces the list to **1348** innings, or 36%. Of these, **1173** (87%) are from the first innings of the match. This is hardly surprising, as the team batting second is most likely to either lose by being bowled out chasing a target score, or win by chasing the target before reaching 50 overs.



Answering the first question
-----------------------------

With the data gathered, I could finally start analysing these 1348 innings to determine at what point teams hit their half-way scores. Or, going back to the questions above, was the 30-over score ever a reliable guideline? Short answer: **Yes** (close enough, anyway).

Over the last 14 years, teams that have played their full 50 overs have, on average, reached half their score at **29.2** overs.[asidemark] [aside]Note for pedants: This is using standard cricket scoring notation, where “29.2 overs” means 29 overs and 2 balls, with 6 balls per over. In this system, “9.6 overs” is equivalent to ”10 overs”. To get mathematical averages, the figures are converted into accurate numbers (e.g. “30.5 overs” becomes 30.833333333 after rounding), then averaged and converted back. The raw figure for the average given is ~29.34.[/aside] This is close enough to 30 overs to give a Mythbusters-style <strong class="mythbusters-confirmed">confirmed</strong> to the old maxim.

<odi-graph>IMAGE: A graph showing the average halfway mark as described in the next paragraph.</odi-graph>

Graphing out the data reveals that, since 2001, the average has been consistently within 2 overs of the legendary 30-over mark. The average started high at 30.3 overs (mostly due to an insufficient amount of data) then dropped down to its lowest value of 28.0 overs in 2002. Since then it has been slowly but steadily increasing to its current value of 29.2 without any decrease along the way. This suggests that modern teams are indeed consistently reaching half their score later in their innings than they were 10-15 years ago.



Digging deeper
-----------------------------

The second question I wanted the answer to was: Has the overall pattern of scoring changed in recent years in a statistically significant way?

In order to find the answer, I graphed out a 100-innings rolling average, to give a better indication of trends over time.

<odi-graph rolling-avg="true" innings-points="false">IMAGE: A graph showing a rolling average average halfway mark as described in the next paragraph.</odi-graph>

This shows a few more peaks and troughs, reaching a lowest point of 27.5 overs in 2002, then jumping up to 29.4 overs in 2004. After another drop to 28.3 overs in 2006, the rolling average remained relatively stable between 29.1 and 29.4 overs for many years. Since the beginning of 2013, the scoring rate has significantly increased, bringing the average for the most recent 100 innings (which reached 50 overs) up to 30.5 overs – the highest it’s ever been.

One reason for the higher scoring – given by commentators and armchair experts alike – has been the [change in rules for fielding restrictions](http://www.espncricinfo.com/ci-icc/content/story/588728.html) in late 2012. The reduction from 4 to 3 fielders outside the 30-yard circle (in the non-Powerplay overs) has provided more opportunities for batsmen to score boundaries by hitting over the top of fielders. But does this theory hold true?

The rolling averages listed above certainly indicate a change in scoring patterns around the same time. Just how much of an effect did the fielding restriction changes have? I compared two groups of innings: One from the rule change on October 30, 2012 until the World Cup final on March 29, 2015 (a period of 2 years, 5 months), and one group from the equivalent time period before the change (giving a start date of May 30, 2010).

<odi-graph
    rolling-avg="true"
    date-start="2010-05-30"
    date-end="2015-03-29"
    highlight="
        Before restriction changes:2010-05-30,2012-10-29;
        After restriction changes:2012-10-30,2015-03-29">
IMAGE: Two highlighted sets of data show ??? WORK SHIT OUT.</odi-graph>

Here we see that ??? TODO: GRAPH THE DATA AND WORK SHIT OUT.

So the answer to the second question, then, is also a resounding **yes**. <strong class="mythbusters-confirmed">confirmed</strong>



Other explorations
-----------------------------

With my primary questions answered, I set about playing with the data to see if there any other interesting little stats jumped out at me. Below are some of the findings.


### Data extremes

The earliest point that a team reached its halfway score was at **16.2** overs, by England against Pakistan at [cric-match id="65029"]Manchester in 2003[/cric-match]. Having scored at a run-rate of 6.24 runs per over to reach 102/3 at that point, England slowed down and scored only 3.03 runs per over from then on, finishing at 204/9 in 50 overs. Pakistan then scored 208/8 in 49.2 overs to win with only 4 balls to spare.

Conversely, the latest point in an innings for a team to reach its halfway score was at **40.3** overs, by Bangladesh against New Zealand at [cric-match id="423784"]Dunedin in 2010[/cric-match]. Bangledesh started extremely slowly, only scoring at 2.27 runs per over to reach 92/6 at 40.3 overs. From then on, the innings finished with a bang as the remaining 91 runs were scored at 9.58 per over to finish at 183/8. Unfortunately for Bangladesh, New Zealand then scored 185/5 in 27.3 overs for a comprehensive victory.


### 1st vs 2nd innings

???


### Test playing nations vs Associates

???



Credits
-----------------------------

* Data from Cricinfo
* Inspiration from MBTA data analysis

### See also

[An analysis of run-rates in the 2015 World Cup](http://www.espncricinfo.com/magazine/content/story/858093.html) on Cricinfo.



* Overall
* CWC15
* Before/after new regulations in 2012
* Best/worst teams
* Best/worst venues
* 1st/2nd innings
* Test playing nations vs associates

