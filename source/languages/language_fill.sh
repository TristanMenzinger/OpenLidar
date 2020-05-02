#!/bin/bash

# Check if arguments were supplied
if (( $# < 3 )); then
    echo "Three arguments required: path/to/input/file.html path/to/output/file.html and /path/to/language/file.lang"
    exit 1
fi

htmli="$1"
htmlo="$2"
input="$3"

languageline=$(head -n 1 $input)

if ! [[ "$languageline" == LANGUAGE* ]]; then 
	# Terminate
	echo "Language missing"
	exit 1
fi

if ! [[ $(tail -c1 "$input" | wc -l) -gt 0 ]]; then
	echo "File does not end on newline. Please add final newline to $input."
fi


values=(${languageline//=/ })
language=$(echo "${values[1]}" | tr '[:upper:]' '[:lower:]')

echo "Converting language: $language from $htmli to $htmlo"
mkdir -p "$language"
cp "$htmli" "$htmlo"

first=true
while read -r line; do

	# Skip first line
	if [[ "$first" = true ]]; then
		first=false
		continue
	fi

	# Check if empty
	linet="$(echo -e "${line}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
	if [[ "$linet" == "" ]]; then
		continue
	fi

	# Check if uncommented
	if [[ "$linet" =~ ^//.* ]]; then
    	continue
	fi
	
	# Careful... 
	IFS='='
	read -ra values <<< "$linet"
	key="${values[0]}"
	value="${values[1]}"
	IFS=' '

	# On linux, this line will fail als sed doesn't need the ''
	sed -i '' "s|{{$key}}|$value|g" "$htmlo"


done < "$input"