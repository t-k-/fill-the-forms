#!/bin/bash
function echo_input()
{
	echo "$name: "
	echo "<input type=\"$1\" name=\"$2\" id=\"$2\" value=\"$3\"><br/>"
}

echo '<html>'
echo '<body>'
echo '<form id="frequent_used">'
while read l
do
	name=`echo $l | awk '{print $1}'`
	value=`echo $l | awk '{$1=""; print substr($0,2);}'`
	echo_input "text" "$name" "$value";
done < gen-form.list
echo '</form>'
echo '</body>'
echo '</html>'
