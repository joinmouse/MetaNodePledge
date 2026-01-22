package config

import (
	"os"
	"path"
	"path/filepath"
	"runtime"

	"github.com/BurntSushi/toml"
)

func init() {
	var tomlFile string
	var err error

	// 优先使用环境变量指定的配置文件路径
	configPath := os.Getenv("CONFIG_PATH")
	if configPath != "" {
		tomlFile = configPath
	} else {
		// 本地开发环境使用相对路径
		currentAbPath := getCurrentAbPathByCaller()
		tomlFile, err = filepath.Abs(currentAbPath + "/configV21.toml")
		//tomlFile, err = filepath.Abs(currentAbPath + "/configV22.toml")
		if err != nil {
			panic("read toml file err: " + err.Error())
		}
	}

	// 检查文件是否存在
	if _, err := os.Stat(tomlFile); os.IsNotExist(err) {
		panic("config file not found: " + tomlFile + " (CONFIG_PATH=" + os.Getenv("CONFIG_PATH") + ")")
	}

	if _, err := toml.DecodeFile(tomlFile, &Config); err != nil {
		panic("read toml file err: " + err.Error())
	}
}

func getCurrentAbPathByCaller() string {
	var abPath string
	_, filename, _, ok := runtime.Caller(0)
	if ok {
		abPath = path.Dir(filename)
	}
	return abPath
}
