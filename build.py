#!/usr/bin/env python
#

# Requirements: pip install markdown

import re
import codecs
import markdown

with codecs.open('src/index.md', 'r', 'utf-8') as input:
    source = input.read()

html = markdown.markdown(source)

# Big callout numbers
# ++1234++
callout = re.compile('\+\+(.*?)\+\+')
html = callout.sub('<q class="callout">\\1</q>', html)

# Links to match scorecards on Cricinfo
# [cric-match id="nnn"]text[/cric-match]
cric_match = re.compile('\[cric-match id="(.*?)"\](.*?)\[\/cric-match\]')
html = cric_match.sub('<a href="http://www.espncricinfo.com/ci/engine/match/\\1.html" title="Match #\\1 on Cricinfo">\\2</a>', html)

with codecs.open('src/template.html', 'r', 'utf-8') as tpl_file:
    template = tpl_file.read()

full_html = template.replace('<!-- CONTENT GOES HERE -->', html)

with codecs.open('index.html', 'w', 'utf-8') as output:
    output.write(full_html)
