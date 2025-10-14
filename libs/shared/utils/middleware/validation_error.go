package middleware

import (
	"fmt"
	"strings"
)

func ValidationErrorStructure(validation_err error) []map[string]interface{} {

	errs := strings.Split(validation_err.Error(), ";")

	fmt.Println(errs)

	var valErrMsg []map[string]interface{}

	for _, v := range errs {
		value := strings.Split(v, ":")
		errMsg := map[string]interface{}{
			"field":   value[0],
			"message": value[1],
		}
		valErrMsg = append([]map[string]interface{}{errMsg}, valErrMsg...)
	}

	return valErrMsg
}

func BindErrorStructure(bind_err error) map[string]interface{} {

	errs := strings.Split(bind_err.Error(), ",")

	fmt.Println(errs)

	bindErrMsg := map[string]interface{}{
		"field":   strings.Split(errs[3], "=")[1],
		"message": strings.Split(errs[1], "=")[1] + " type : " + strings.Split(errs[1], "=")[2],
	}

	return bindErrMsg
}

func JsonMarshalErrorStructure(marshal_err error) map[string]interface{} {

	errs := strings.Split(marshal_err.Error(), " ")

	fmt.Println(errs)

	marshalErrMsg := map[string]interface{}{
		"field":   errs[8],
		"message": marshal_err.Error(),
	}

	return marshalErrMsg
}

func ValidationFieldStructure(validation_err error) []map[string]interface{} {

	errs := strings.Split(validation_err.Error(), ";")

	fmt.Println(errs)

	var valErrMsg []map[string]interface{}

	for _, v := range errs {
		errMsg := map[string]interface{}{
			"message": v,
		}
		valErrMsg = append([]map[string]interface{}{errMsg}, valErrMsg...)
	}

	return valErrMsg
}
