#!/bin/bash
rm -f src.zip
mv dev-dashboard /var/tmp
mv .git /var/tmp/form_hero_git_tmp_file
zip -r src.zip .
mv /var/tmp/dev-dashboard .
mv /var/tmp/form_hero_git_tmp_file ./.git

rm -rf tmp
git clone https://github.com/tkhost/tkhost.github.io.git tmp
mkdir -p tmp/form-hero
cp test/job.html tmp/form-hero/
cd tmp
git add -A
git commit -m 'update job.html'
git push
cd ..
rm -rf tmp
