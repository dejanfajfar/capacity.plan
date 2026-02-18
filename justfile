# run the build
build:
	npm run build

# Do a local cicd run
ci: build
	npm run build
	npm run test
	npm run format

# run all unit test
test:
	npm run test -- run
	cd ./src-tauri && cargo test --all-features --verbose 

# install dependencies
init:
	npm install

# Run the application locally
run dev="dev":
	npm run tauri {{dev}}
