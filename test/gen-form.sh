#!/bin/bash
echo '<html>'
echo '<body>'
while read l
do
	name=`echo $l | awk '{print $1}'`
	value=`echo $l | awk '{$1=""; print substr($0,2);}'`
	echo "$name: "
	echo "<input type=\"text\" name=\"$name\" id=\"$name\" value=\"$value\"><br/>"
done < gen-form.list
echo '</body>'
echo '</html>'
