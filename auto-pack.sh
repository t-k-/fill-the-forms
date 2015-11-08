#!/bin/bash
rm -f src.zip
mv dev-dashboard /var/tmp
mv .git /var/tmp/form_hero_git_tmp_file
zip -r src.zip .
mv /var/tmp/dev-dashboard .
mv /var/tmp/form_hero_git_tmp_file ./.git

scp test/job.html root@104.131.253.240:/var/www/html
