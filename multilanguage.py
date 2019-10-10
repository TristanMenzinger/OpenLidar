import os

DIRECTORY_ROOT_FILE = "html"
DIRECTORY_LANGUAGE_FILES = "languages"

languages = [lang.split(".")[0] for lang in os.listdir(DIRECTORY_LANGUAGE_FILES)]

for language in languages:
	if not os.path.exists(language):
		os.makedirs(language)

for language in languages:
	# Read the variables
	variables = {};
	with open(os.path.join(DIRECTORY_LANGUAGE_FILES, language+".lang"), "r") as f:
		line = True
		while(line):
			line = f.readline()
			if(line[:2] != "//" and "=" in line):
				line = line.split("=")
				variables[line[0]] = line[1].strip("\n")

	# Read html
	with open(os.path.join(DIRECTORY_ROOT_FILE, "index.html"), "r") as html:
		text = html.read()

	# Replace
	for v in variables:
		text = text.replace("**"+v+"**",variables[v])

	# Write to html
	with open(os.path.join(language, "index.html"), "w") as outfile:
		outfile.write(text)